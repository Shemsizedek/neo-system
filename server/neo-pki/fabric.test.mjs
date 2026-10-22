import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import policy from '../../architecture/neo-sovereign-identity-policy.json' with {type:'json'}
import {createCaIdentity,createCertificateRequest,validateCertificateRequest,issueIdentityCredential,verifyIdentityCredential,revokeCredential,rotationState,authorizeMtlsSession,buildX509IssuanceRequest,pkiSnapshot} from './fabric.mjs'

const keys=()=>crypto.generateKeyPairSync('ed25519')
const pub=k=>k.export({type:'spki',format:'pem'})

test('node identity requires prior attestation evidence',()=>{
  const kp=keys()
  const req=createCertificateRequest({subject_id:'node-1',subject_type:'NODE',public_key:pub(kp.publicKey),attestation_ref:'ATT-1'})
  assert.equal(validateCertificateRequest({request:req,policy,attestedNodes:[]}).valid,false)
  assert.equal(validateCertificateRequest({request:req,policy,attestedNodes:['node-1']}).valid,true)
})

test('issuer signs short-lived identity credential and verifier checks it',()=>{
  const ca=keys(),node=keys()
  const issuer=createCaIdentity({id:'estate-intermediate-1',publicKey:pub(ca.publicKey)})
  const req=createCertificateRequest({subject_id:'node-1',subject_type:'NODE',public_key:pub(node.publicKey),attestation_ref:'ATT-1',requested_ttl_hours:12})
  const cred=issueIdentityCredential({request:req,issuer,issuerPrivateKey:ca.privateKey,policy,attestedNodes:['node-1']})
  assert.equal(verifyIdentityCredential({credential:cred,issuer}).valid,true)
  assert.equal(cred.x509_status,'ADAPTER_REQUIRED')
})

test('revocation is fail closed for mTLS authorization',()=>{
  const ca=keys(),a=keys(),b=keys()
  const issuer=createCaIdentity({id:'estate-intermediate-1',publicKey:pub(ca.publicKey)})
  const nodeReq=createCertificateRequest({subject_id:'node-a',subject_type:'NODE',public_key:pub(a.publicKey),attestation_ref:'A'})
  const svcReq=createCertificateRequest({subject_id:'neo-storage',subject_type:'SERVICE',public_key:pub(b.publicKey),node_id:'node-a',trust_zone:'STORAGE'})
  const nodeCred=issueIdentityCredential({request:nodeReq,issuer,issuerPrivateKey:ca.privateKey,policy,attestedNodes:['node-a']})
  const svcCred=issueIdentityCredential({request:svcReq,issuer,issuerPrivateKey:ca.privateKey,policy,attestedNodes:['node-a']})
  const rev=[revokeCredential({credential:nodeCred,reason:'test'})]
  assert.equal(authorizeMtlsSession({clientCredential:nodeCred,serverCredential:svcCred,issuer,policy,revocations:rev,expectedZone:'STORAGE'}).authorized,false)
})

test('rotation window is policy driven',()=>{
  const soon={not_after:new Date(Date.now()+30*60000).toISOString()}
  assert.equal(rotationState({credential:soon,policy}).rotate,true)
})

test('x509 is an explicit issuance adapter contract, not fabricated',()=>{
  const ca=keys(),svc=keys(),issuer=createCaIdentity({id:'ca',publicKey:pub(ca.publicKey)})
  const req=createCertificateRequest({subject_id:'neo-compute',subject_type:'SERVICE',public_key:pub(svc.publicKey),node_id:'node-1'})
  const cred=issueIdentityCredential({request:req,issuer,issuerPrivateKey:ca.privateKey,policy})
  const x=buildX509IssuanceRequest({credentialRequest:req,credential:cred})
  assert.equal(x.x509_certificate,null)
  assert.equal(x.issuance_status,'PENDING_EXTERNAL_OR_HSM_CA')
})

test('PKI snapshot remains operational evidence',()=>{
  assert.equal(pkiSnapshot({}).estate,'Global Vast Estate')
})
