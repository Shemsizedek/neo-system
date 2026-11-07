import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { DatabaseSync } from 'node:sqlite'
import { createSqliteApprovalStore } from './approval-store.mjs'

const owner='11'.repeat(32),pairingId='22'.repeat(32),id='33'.repeat(32)
const record={requestId:id,requestHash:'44'.repeat(32),pairingId,ownerHash:owner,psbtHash:'55'.repeat(32),intentHash:'66'.repeat(32)}
const code=expected=>error=>error.code===expected
function setup(t){
 const directory=mkdtempSync(join(tmpdir(),'neo-vm-state-')),filename=join(directory,'state.sqlite'),stores=[]
 const open=()=>{const s=createSqliteApprovalStore({filename,now:()=>1100});stores.push(s);return s}
 const store=open()
 // Storage-layer fixtures only; the pairing authority's crypto checks have
 // separate tests and are mandatory in the paired signing workflow.
 store.savePairingChallenge({challengeId:pairingId,ownerHash:owner,proposalHash:'77'.repeat(32),expiresAt:1200,proposal:{signerId:'fixture'}},'neo-nvm/pairing-approval-v1:fixture:'+'01'.repeat(32))
 store.activatePairing({pairingId,ownerHash:owner,signerId:'fixture',expiresAt:3600})
 t.after(()=>{for(const s of stores)s.close();rmSync(directory,{recursive:true,force:true})})
 return{store,open,filename}
}
test('durable signing history records each boundary and survives restart without raw secrets',t=>{
 const s=setup(t);s.store.prepareSigningAttempt(record);s.store.advanceSigningAttempt(id,owner,'DISPATCHED');s.store.advanceSigningAttempt(id,owner,'RESPONSE_VERIFIED',{rawTransactionHash:'88'.repeat(32)});s.store.advanceSigningAttempt(id,owner,'VALIDATED',{txid:'99'.repeat(32),wtxid:'aa'.repeat(32),feeSats:10000,blockHash:'bb'.repeat(32)})
 s.store.close();const store=s.open(),audit=store.signingAudit(id,owner)
 assert.deepEqual(audit.events.map(e=>e.stage),['PREPARED','DISPATCHED','RESPONSE_VERIFIED','VALIDATED'])
 assert.equal(store.getSigningAttempt(id,owner).signatureMayExist,true)
 assert.equal(store.listSigningAttempts(owner,{recoveryOnly:true}).length,0)
 assert.equal(JSON.stringify(audit).includes('rawTransactionHex'),false)
})
test('invalid transitions, duplicate operations and secret-bearing audit metadata are rejected',t=>{
 const s=setup(t);s.store.prepareSigningAttempt(record)
 assert.throws(()=>s.store.advanceSigningAttempt(id,owner,'VALIDATED'),code('SIGNER_AUDIT_TRANSITION_INVALID'))
 assert.throws(()=>s.store.prepareSigningAttempt(record),code('SIGNER_STATE_UNAVAILABLE'))
 assert.throws(()=>s.store.advanceSigningAttempt(id,owner,'DISPATCHED',{token:'TEST_ONLY'}),code('SIGNER_AUDIT_METADATA_INVALID'))
 s.store.advanceSigningAttempt(id,owner,'CANCELLED',{reasonCode:'PAIRING_NOT_ACTIVE'})
 assert.throws(()=>s.store.advanceSigningAttempt(id,owner,'DISPATCHED'),code('SIGNER_AUDIT_TRANSITION_INVALID'))
})
test('owner-scoped audit reads do not expose another owner records',t=>{
 const s=setup(t);s.store.prepareSigningAttempt(record)
 assert.equal(s.store.getSigningAttempt(id,'ff'.repeat(32)),null)
 assert.equal(s.store.signingAudit(id,'ff'.repeat(32)),null)
 assert.deepEqual(s.store.listSigningAttempts('ff'.repeat(32)),[])
})
test('a killed process leaves dispatched work visible for manual recovery and never resends it',async t=>{
 const s=setup(t),child=spawn(process.execPath,['scripts/test-support/neo-vm-state-worker.mjs',s.filename],{cwd:new URL('../../',import.meta.url),stdio:['ignore','ignore','pipe','ipc']})
 t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL')})
 const committed=once(child,'message'),ended=once(child,'exit');child.send(record)
 const [message]=await committed;assert.equal(message.committed,true);child.kill('SIGKILL');await ended
 s.store.close();const store=s.open(),pending=store.listSigningAttempts(owner,{recoveryOnly:true})
 assert.equal(pending.length,1);assert.equal(pending[0].status,'DISPATCHED');assert.equal(pending[0].signatureMayExist,true)
 assert.equal(store.signingAudit(id,owner).valid,true)
})
test('audit corruption and mismatched summary rows are detected',t=>{
 const s=setup(t);s.store.prepareSigningAttempt(record)
 const db=new DatabaseSync(s.filename)
 db.prepare('UPDATE neo_vm_signing_events SET metadata_json=?').run('{"requestHash":"TEST_ONLY_CORRUPTION"}')
 db.close();assert.throws(()=>s.store.signingAudit(id,owner),code('SIGNER_AUDIT_INTEGRITY_FAILED'))
})
test('revocation prevents a prepared attempt from crossing the dispatch boundary',t=>{
 const s=setup(t);s.store.prepareSigningAttempt(record)
 s.store.revokeSignerPairing(pairingId,owner,'neo-nvm/pairing-revoke-v1:fixture:'+'02'.repeat(32))
 assert.throws(()=>s.store.advanceSigningAttempt(id,owner,'DISPATCHED'),code('PAIRING_NOT_ACTIVE'))
 assert.equal(s.store.getSigningAttempt(id,owner).status,'PREPARED')
})
