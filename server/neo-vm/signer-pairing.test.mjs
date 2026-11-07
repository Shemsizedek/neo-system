import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { mkdtempSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createSqliteApprovalStore } from './approval-store.mjs'
import { createSignerPairingAuthority } from './signer-pairing.mjs'
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { fixtureKey } from '../../scripts/test-support/neo-vm-fixtures.mjs'
import { fixtureEdPublicHex,fixturePairingApproval,fixturePairingDeviceProof,fixturePairingRevocation } from '../../scripts/test-support/neo-vm-pairing-fixtures.mjs'

const keys=generateKeyPairSync('ed25519'),device=generateKeyPairSync('ed25519'),wrong=generateKeyPairSync('ed25519')
const code=expected=>error=>error.code===expected
function setup(t) {
  const directory=mkdtempSync(join(tmpdir(),'neo-vm-pairing-')),filename=join(directory,'state.sqlite'),stores=[]
  const state={clock:1100,active:true,reads:0},subject='google:fixture-owner',secret='TEST_ONLY_PAIRING_SESSION_SECRET_'.repeat(2)
  const open=()=>{const store=createSqliteApprovalStore({filename,now:()=>state.clock});stores.push(store);return store}
  t.after(()=>{for(const store of stores)store.close();rmSync(directory,{recursive:true,force:true})})
  const options={approvalStore:open(),now:()=>state.clock,registry:{async getNEOpassCredential(){state.reads++;await state.onRegistry?.();return{subject,provider:'google',providerSubject:'fixture-owner',status:state.active?'active':'suspended'}}},
    jwtSecret:secret,jwtIssuer:'neo-pass',bindings:[{subject,approverId:'fixture-operator',publicKey:keys.publicKey}],
    approvedDeviceKeys:[{signerId:'fixture-device',publicKeyHex:fixtureEdPublicHex(device.publicKey),endpoint:'https://signer.example/v1/neo-vm/sign'}]}
  const proposal={version:1,network:'regtest',signerId:'fixture-device',devicePublicKeyHex:fixtureEdPublicHex(device.publicKey),bitcoinPublicKeys:[fixtureKey(2).publicKeyHex,fixtureKey(1).publicKeyHex],endpoint:'https://signer.example/v1/neo-vm/sign',pairingExpiresAt:3600}
  const token=issueNeopassToken({subject,secret,now:()=>1000000,ttlSeconds:200})
  const authority=createSignerPairingAuthority(options)
  const challenge=()=>authority.challenge({token,proposal,approval:fixturePairingApproval(proposal,keys.privateKey)})
  const pair=async()=>{const c=await challenge();return authority.complete({token,challengeId:c.challengeId,...fixturePairingDeviceProof(c,device.privateKey)})}
  return{state,options,proposal,token,authority,challenge,pair,open,filename}
}

test('pairing requires operator authorization and real Ed25519 and Bitcoin key possession',async t=>{
  const s=setup(t),paired=await s.pair()
  assert.equal(paired.bitcoinKeysProven,2)
  const active=await s.authority.getActive({token:s.token,pairingId:paired.pairingId})
  assert.equal(active.signer.signerId,'fixture-device');assert.equal(active.signer.publicKey.type,'public')
  assert.equal(active.signer.bitcoinPublicKeys.length,2)
})
test('pairing certificate and replay protection survive authority and database restart',async t=>{
  const s=setup(t),c=await s.challenge(),response=fixturePairingDeviceProof(c,device.privateKey)
  const paired=await s.authority.complete({token:s.token,challengeId:c.challengeId,...response})
  s.options.approvalStore.close()
  const authority=createSignerPairingAuthority({...s.options,approvalStore:s.open()})
  assert.equal((await authority.getActive({token:s.token,pairingId:paired.pairingId})).pairingId,paired.pairingId)
  await assert.rejects(()=>authority.complete({token:s.token,challengeId:c.challengeId,...response}),code('PAIRING_CHALLENGE_USED_OR_EXPIRED'))
  await assert.rejects(()=>authority.challenge({token:s.token,proposal:s.proposal,approval:fixturePairingApproval(s.proposal,keys.privateKey)}),code('PAIRING_APPROVAL_REPLAYED'))
})
test('self-enrolled keys, endpoint substitution and unsigned or forged owner approval are denied',async t=>{
  const s=setup(t)
  for(const proposal of [{...s.proposal,devicePublicKeyHex:fixtureEdPublicHex(wrong.publicKey)},{...s.proposal,endpoint:'https://other.example/v1/neo-vm/sign'}]) await assert.rejects(()=>s.authority.challenge({token:s.token,proposal,approval:fixturePairingApproval(proposal,keys.privateKey)}),code('PAIRING_DEVICE_NOT_PINNED'))
  await assert.rejects(()=>s.authority.challenge({token:s.token,proposal:s.proposal,approval:fixturePairingApproval(s.proposal,wrong.privateKey)}),code('PAIRING_OWNER_PROOF_INVALID'))
  assert.equal(s.options.approvalStore.inspectSignerState().pairings,0)
})
test('wrong Bitcoin proof, wrong device proof and key-order mutation cannot activate pairing',async t=>{
  const s=setup(t),c=await s.challenge(),correct=fixturePairingDeviceProof(c,device.privateKey)
  const bad=structuredClone(correct);bad.bitcoinProofs[0].signatureHex='00'.repeat(70)
  await assert.rejects(()=>s.authority.complete({token:s.token,challengeId:c.challengeId,...bad}),code('PAIRING_BITCOIN_PROOF_INVALID'))
  await assert.rejects(()=>s.authority.complete({token:s.token,challengeId:c.challengeId,...fixturePairingDeviceProof(c,wrong.privateKey)}),code('PAIRING_DEVICE_PROOF_INVALID'))
  await assert.rejects(()=>s.authority.complete({token:s.token,challengeId:c.challengeId,...correct,bitcoinProofs:[...correct.bitcoinProofs].reverse()}),code('PAIRING_KEY_PROOFS_REQUIRED'))
  assert.equal((await s.authority.complete({token:s.token,challengeId:c.challengeId,...correct})).status,'ACTIVE')
})
test('concurrent completion has one winner and cannot silently replace an active signer',async t=>{
  const s=setup(t),c=await s.challenge(),input={token:s.token,challengeId:c.challengeId,...fixturePairingDeviceProof(c,device.privateKey)}
  const results=await Promise.allSettled([s.authority.complete(input),s.authority.complete(input)])
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1)
  const second=await s.authority.challenge({token:s.token,proposal:s.proposal,approval:fixturePairingApproval(s.proposal,keys.privateKey,{nonce:'03'.repeat(32)})})
  await assert.rejects(()=>s.authority.complete({token:s.token,challengeId:second.challengeId,...fixturePairingDeviceProof(second,device.privateKey)}),code('PAIRING_SIGNER_ALREADY_ACTIVE'))
})
test('expired, inactive and foreign-network pairing requests fail closed',async t=>{
  const s=setup(t),c=await s.challenge();s.state.clock=1200
  await assert.rejects(()=>s.authority.complete({token:s.token,challengeId:c.challengeId,...fixturePairingDeviceProof(c,device.privateKey)}),code('PSBT_NEOPASS_SESSION_INVALID'))
  s.state.clock=1100;s.state.active=false
  await assert.rejects(()=>s.authority.getActive({token:s.token,pairingId:c.challengeId}),code('PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED'))
  const proposal={...s.proposal,network:'mainnet'}
  assert.throws(()=>fixturePairingApproval(proposal,keys.privateKey),code('PAIRING_PROPOSAL_INVALID'))
})
test('revocation requires a current owner signature and persists across restart',async t=>{
  const s=setup(t),paired=await s.pair()
  await assert.rejects(()=>s.authority.revoke({token:s.token,approval:fixturePairingRevocation(paired.pairingId,wrong.privateKey)}),code('PAIRING_OWNER_PROOF_INVALID'))
  await s.authority.revoke({token:s.token,approval:fixturePairingRevocation(paired.pairingId,keys.privateKey)})
  s.options.approvalStore.close()
  const authority=createSignerPairingAuthority({...s.options,approvalStore:s.open()})
  await assert.rejects(()=>authority.getActive({token:s.token,pairingId:paired.pairingId}),code('PAIRING_NOT_ACTIVE'))
})
test('pairing reads reject certificate corruption and changed device pins',async t=>{
  const s=setup(t),paired=await s.pair()
  const authority=createSignerPairingAuthority({...s.options,approvedDeviceKeys:[{...s.options.approvedDeviceKeys[0],publicKeyHex:fixtureEdPublicHex(wrong.publicKey)}]})
  await assert.rejects(()=>authority.getActive({token:s.token,pairingId:paired.pairingId}),code('PAIRING_DEVICE_NOT_PINNED'))
  const db=new DatabaseSync(s.filename),row=db.prepare('SELECT record_json FROM neo_vm_signer_pairings').get(),record=JSON.parse(row.record_json)
  record.expiresAt++;db.prepare('UPDATE neo_vm_signer_pairings SET record_json=?').run(JSON.stringify(record));db.close()
  await assert.rejects(()=>s.authority.getActive({token:s.token,pairingId:paired.pairingId}),code('PAIRING_CERTIFICATE_INVALID'))
})
test('pairing captures caller proof and proposal before registry I/O',async t=>{
  const s=setup(t),proposal=structuredClone(s.proposal),approval=fixturePairingApproval(proposal,keys.privateKey)
  s.state.onRegistry=async()=>{proposal.endpoint='https://other.example/v1/neo-vm/sign';approval.signatureHex='00'.repeat(64)}
  const c=await s.authority.challenge({token:s.token,proposal,approval})
  assert.equal(c.proposal.endpoint,s.proposal.endpoint)
})
test('another valid NEOpass owner cannot read or revoke an existing pairing',async t=>{
  const s=setup(t),paired=await s.pair(),subject='google:other-owner'
  const authority=createSignerPairingAuthority({...s.options,bindings:[{subject,approverId:'other-operator',publicKey:wrong.publicKey}],
    registry:{async getNEOpassCredential(){return{subject,provider:'google',providerSubject:'other-owner',status:'active'}}}})
  const token=issueNeopassToken({subject,secret:s.options.jwtSecret,now:()=>1000000,ttlSeconds:200})
  await assert.rejects(()=>authority.getActive({token,pairingId:paired.pairingId}),code('PAIRING_NOT_ACTIVE'))
  await assert.rejects(()=>authority.revoke({token,approval:fixturePairingRevocation(paired.pairingId,wrong.privateKey,{authorizerId:'other-operator'})}),code('PAIRING_NOT_ACTIVE'))
  assert.equal((await s.authority.getActive({token:s.token,pairingId:paired.pairingId})).pairingId,paired.pairingId)
})
