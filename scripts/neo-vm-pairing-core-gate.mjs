import assert from 'node:assert/strict'
import { generateKeyPairSync,randomBytes } from 'node:crypto'
import { mkdtemp,rm,writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join,resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runExternalSignerGate } from './neo-vm-signer-core-gate.mjs'
import { createSqliteApprovalStore } from '../server/neo-vm/approval-store.mjs'
import { createSignerPairingAuthority } from '../server/neo-vm/signer-pairing.mjs'
import { createPairedSigningWorkflow } from '../server/neo-vm/paired-signing.mjs'
import { issueNeopassToken } from '../server/neo-platform-api/neopass-google-auth.mjs'
import { sha256Hex } from '../core/neo-bvm/runtime.mjs'
import { fixturePsbt,fixtureIntent,fixtureApproval } from './test-support/neo-vm-fixtures.mjs'
import { fixtureEdPublicHex,fixturePairingApproval,fixturePairingRevocation } from './test-support/neo-vm-pairing-fixtures.mjs'
import { startFixtureSigner } from './test-support/neo-vm-signer-fixtures.mjs'

export async function runPairingAuditGate({bitcoindPath,evidencePath}={}){
 const previous=await runExternalSignerGate({bitcoindPath,afterExternalSignerChecks:async({program,plan,outpoint,reviewRpc,validationRpc,controlRpc})=>{
  const directory=await mkdtemp(join(tmpdir(),'neo-vm-pairing-core-')),operator=generateKeyPairSync('ed25519'),subject='google:pairing-regtest-owner',secret=randomBytes(48)
  const ownerHash=sha256Hex(Buffer.from(`neo-nvm/neopass-subject-v1\0${subject}`))
  let store,fixture,authority,clock=1100,serial=3000,signerCalls=0,afterSign,afterPolicy,denyPreparedIdentity=false
  const cases=[]
  try{
   const open=()=>createSqliteApprovalStore({filename:join(directory,'gateway.sqlite'),now:()=>clock})
   store=open();fixture=await startFixtureSigner({directory,operatorPublicKey:operator.publicKey,subjectHash:ownerHash})
   const token=issueNeopassToken({subject,secret,now:()=>1000000,ttlSeconds:200})
   const identity={jwtSecret:secret,jwtIssuer:'neo-pass',bindings:[{subject,approverId:'fixture-operator',publicKey:operator.publicKey}],now:()=>clock,
    registry:{async getNEOpassCredential(){if(denyPreparedIdentity && store.listSigningAttempts(ownerHash).some(a=>a.status==='PREPARED'))throw Error('fixture registry unavailable');return{subject,provider:'google',providerSubject:'pairing-regtest-owner',status:'active'}}}}
   const createAuthority=()=>createSignerPairingAuthority({...identity,approvalStore:store,approvedDeviceKeys:[{signerId:'fixture-device',publicKeyHex:fixtureEdPublicHex(fixture.publicKey),endpoint:fixture.endpoint}]})
   authority=createAuthority()
   const proposal={version:1,network:'regtest',signerId:'fixture-device',devicePublicKeyHex:fixtureEdPublicHex(fixture.publicKey),bitcoinPublicKeys:[plan.redeemPublicKeyHex,plan.refundPublicKeyHex],endpoint:fixture.endpoint,pairingExpiresAt:3600}
   const nextNonce=()=> (++serial).toString(16).padStart(64,'0')
   const challenge=()=>authority.challenge({token,proposal,approval:fixturePairingApproval(proposal,operator.privateKey,{nonce:nextNonce()})})
   const enroll=async()=>{const c=await challenge(),proof=await fixture.adapter.requestPairingProof({challenge:c,signal:new AbortController().signal});return authority.complete({token,challengeId:c.challengeId,...proof})}
   let paired=await enroll()
   cases.push({name:'HTTP pairing proves external device Ed25519 and both Bitcoin keys',passed:true,keysProven:paired.bitcoinKeysProven})
   const pending=await challenge(),response=await fixture.adapter.requestPairingProof({challenge:pending,signal:new AbortController().signal})
   await assert.rejects(()=>authority.complete({token,challengeId:pending.challengeId,...response}),e=>e.code==='PAIRING_SIGNER_ALREADY_ACTIVE')
   cases.push({name:'active device key cannot be silently replaced by another pairing',passed:true})
   await assert.rejects(()=>fixture.adapter.requestPairingProof({challenge:pending,signal:new AbortController().signal}),e=>e.code==='SIGNER_TRANSPORT_RESPONSE_INVALID')
   cases.push({name:'device independently rejects pairing approval replay over HTTP',passed:true})
   await fixture.configure('wrong-pairing-key')
   const bad=await challenge(),badProof=await fixture.adapter.requestPairingProof({challenge:bad,signal:new AbortController().signal})
   await assert.rejects(()=>authority.complete({token,challengeId:bad.challengeId,...badProof}),e=>e.code==='PAIRING_BITCOIN_PROOF_INVALID')
   cases.push({name:'device attestation cannot substitute for control of a claimed Bitcoin key',passed:true})
   await fixture.configure('normal')
   const workflow=(timeoutMs=1000)=>createPairedSigningWorkflow({...identity,approvalStore:store,pairingAuthority:authority,reviewRpc,
    validationRpc:async(method,params)=>{const r=await validationRpc(method,params);if(method==='testmempoolaccept')await afterPolicy?.();return r},timeoutMs,
    adapterForPairing:()=>({async requestSignature(input){signerCalls++;const r=await fixture.adapter.requestSignature(input);await afterSign?.();return r}})})
   const input=(branch='redeem')=>{const request={program,psbtBase64:fixturePsbt({plan,outpoint,branch}),intent:fixtureIntent(plan,outpoint,branch)};request.approval=fixtureApproval(request,operator.privateKey,{nonce:nextNonce()});return{token,pairingId:paired.pairingId,request}}
   const first=input(),receipt=await workflow().signAndValidate(first)
   assert.equal(receipt.auditRecorded,true);assert.equal(store.getSigningAttempt(receipt.requestId,ownerHash).status,'VALIDATED');assert.equal(store.signingAudit(receipt.requestId,ownerHash).events.length,4)
   cases.push({name:'paired redeem signing commits PREPARED, DISPATCHED, RESPONSE_VERIFIED and VALIDATED',passed:true,txid:receipt.txid})
   const refund=await workflow().signAndValidate(input('refund'))
   assert.equal(store.signingAudit(refund.requestId,ownerHash).valid,true)
   cases.push({name:'paired mature refund signing records independently validated Core result',passed:true})
   store.close();store=open();authority=createAuthority()
   assert.equal((await authority.getActive({token,pairingId:paired.pairingId})).pairingId,paired.pairingId)
   assert.equal(store.signingAudit(receipt.requestId,ownerHash).valid,true)
   await assert.rejects(()=>workflow().signAndValidate(first),e=>e.code==='PSBT_APPROVAL_REPLAYED')
   cases.push({name:'pairing, audit chain and approval replay protection survive gateway restart',passed:true})
   await fixture.configure('timeout');const timed=input(),callsBefore=signerCalls
   await assert.rejects(()=>workflow(100).signAndValidate(timed),e=>e.code==='SIGNER_RESPONSE_TIMEOUT')
   assert.equal(store.listSigningAttempts(ownerHash,{recoveryOnly:true}).some(a=>a.status==='UNRESOLVED'&&a.signatureMayExist),true)
   await assert.rejects(()=>workflow(100).signAndValidate(timed),e=>e.code==='PSBT_APPROVAL_REPLAYED');assert.equal(signerCalls-callsBefore,1)
   cases.push({name:'timeout persists an unresolved outcome and does not resend the approval',passed:true})
   await fixture.configure('normal');denyPreparedIdentity=true;const before=signerCalls
   await assert.rejects(()=>workflow().signAndValidate(input()),e=>e.code==='PSBT_NEOPASS_REGISTRY_UNAVAILABLE')
   assert.equal(signerCalls,before);assert.equal(store.listSigningAttempts(ownerHash).some(a=>a.status==='CANCELLED'&&!a.signatureMayExist),true)
   cases.push({name:'identity outage after preparation cancels before any HTTP signing call',passed:true});denyPreparedIdentity=false
   afterSign=async()=>authority.revoke({token,approval:fixturePairingRevocation(paired.pairingId,operator.privateKey,{nonce:nextNonce()})})
   await assert.rejects(()=>workflow().signAndValidate(input()),e=>e.code==='PAIRING_NOT_ACTIVE')
   cases.push({name:'revocation during external signing persists an unresolved outcome',passed:true});afterSign=undefined
   const revokedCalls=signerCalls,consumed=store.inspect().consumedApprovals
   await assert.rejects(()=>workflow().signAndValidate(input()),e=>e.code==='PAIRING_NOT_ACTIVE')
   assert.equal(signerCalls,revokedCalls);assert.equal(store.inspect().consumedApprovals,consumed)
   cases.push({name:'revoked pairing cannot consume a new approval or contact its device',passed:true})
   paired=await enroll()
   const burn=await controlRpc('getdescriptorinfo',['raw(0014'+'11'.repeat(20)+')'])
   afterPolicy=async()=>controlRpc('generatetodescriptor',[1,burn.descriptor])
   await assert.rejects(()=>workflow().signAndValidate(input()),e=>e.code==='SIGNER_CHAIN_CHANGED_DURING_VALIDATION')
   cases.push({name:'real Core chain change preserves response evidence and unresolved final outcome',passed:true});afterPolicy=undefined
   const concurrent=input(),beforeCount=store.inspectSignerState().attempts,beforeCalls=signerCalls
   const results=await Promise.allSettled([workflow().signAndValidate(concurrent),workflow().signAndValidate(concurrent)])
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(signerCalls-beforeCalls,1);assert.equal(store.inspectSignerState().attempts-beforeCount,1)
   cases.push({name:'concurrent paired calls create exactly one attempt and one device call',passed:true})
   for(const a of store.listSigningAttempts(ownerHash))assert.equal(store.signingAudit(a.requestId,ownerHash).valid,true)
   assert.deepEqual(await controlRpc('getrawmempool',[]),[])
   return{status:'PASS',cases,store:store.inspectSignerState(),signerCalls,separateFixtureSigner:true,fixtureKeysOnly:true,realDevicePaired:false,productionSigningEnabled:false,applicationBroadcasts:0}
  }finally{await fixture?.close();store?.close();await rm(directory,{recursive:true,force:true})}
 }})
 const{pairingGate,...signerRegression}=previous.externalSigner
 const report={gate:'NEO-VM-G7',checkedAt:previous.checkedAt,status:'PASS',bitcoinCore:previous.bitcoinCore,isolation:previous.isolation,
  gate3Regression:previous.gate3Regression,gate4Regression:previous.gate4Regression,gate5Regression:previous.gate5Regression,gate6Regression:signerRegression,
  pairingAudit:pairingGate,mempoolUnchanged:previous.mempoolUnchanged,productionConnected:false,applicationBroadcasts:0}
 if(evidencePath)await writeFile(evidencePath,JSON.stringify(report,null,2)+'\n')
 return report
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))runPairingAuditGate({bitcoindPath:process.env.BITCOIND_PATH,evidencePath:process.env.NEO_VM_EVIDENCE})
 .then(report=>process.stdout.write(JSON.stringify(report,null,2)+'\n')).catch(error=>{process.stderr.write(`[neo-vm-pairing-gate] ${error.message}\n`);process.exitCode=1})
