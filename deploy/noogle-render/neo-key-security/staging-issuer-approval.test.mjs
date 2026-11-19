import assert from 'node:assert/strict';
import test from 'node:test';
import {generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {createNeoKeyStagingIssuer} from './staging-issuer.mjs';
import {createNeoKeyBootstrapApprovalService} from './bootstrap-approval.mjs';

const now=1_900_000_000_000;
const subject='google:member-one',rpId='connect.example.test',origin='https://connect.example.test';
const makeKey=()=>generateKeyPairSync('ed25519');

test('staging issuer requires trusted identity decision, authentic Ed25519 and unrevoked session',async()=>{
  const {privateKey,publicKey}=makeKey();
  let active=true;
  const issuer=createNeoKeyStagingIssuer({privateKey,publicKey,now:()=>now,
    authorizeSession:async ({subject,evidence})=>evidence==='trusted-server-proof'
      ? {approved:true,subject,method:'verified-identity'}:null,
    isSessionActive:async()=>active});
  await assert.rejects(()=>issuer.issue({subject,evidence:{approved:true}}),/identity_approval_required/);
  const token=await issuer.issue({subject,evidence:'trusted-server-proof'});
  const claims=await issuer.verify(token);
  assert.equal(claims.sub,subject);
  assert.equal(claims.token_use,'neo-key-session');
  assert.ok(claims.exp-claims.iat<=300);
  assert.equal(await issuer.verify(token.slice(0,-2)+'aa'),null);
  const {publicKey:wrongPublicKey}=makeKey();
  const stranger=createNeoKeyStagingIssuer({privateKey,publicKey:wrongPublicKey,now:()=>now,
    authorizeSession:async()=>({approved:true,subject,method:'verified-identity'}),
    isSessionActive:async()=>true});
  assert.equal(await stranger.verify(token),null);
  active=false;
  assert.equal(await issuer.verify(token),null);
});
test('issuer rejects unsupported keys and missing trusted callbacks',()=>{
  assert.throws(()=>createNeoKeyStagingIssuer(),/configuration_required/);
  const key=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  assert.throws(()=>createNeoKeyStagingIssuer({privateKey:key.privateKey,publicKey:key.publicKey,
    authorizeSession:()=>{},isSessionActive:()=>{}}),/configuration_required/);
});
function approvals(){
  const a=makeKey(),b=makeKey(), c=makeKey();
  const approverKeys=new Map([['security-reviewer-a',a.publicKey],['security-reviewer-b',b.publicKey]]);
  const rows=new Map();
  const store={
    async insertApproval(p){
      if(rows.has(p.authorizationRef))throw Error('duplicate');
      rows.set(p.authorizationRef,{...p,consumed:false});
    },
    async findValidApproval(p){
      const r=rows.get(p.authorizationRef);
      return r&&!r.consumed&&r.subject===p.subject&&r.rpId===p.rpId&&r.origin===p.origin&&
        r.expiresAt>p.now?{...r,approverCount:r.approverIds[0]!==r.approverIds[1]?2:0}:null;
    }
  };
  const service=createNeoKeyBootstrapApprovalService({approverKeys,store,now:()=>now});
  const authorizationRef=randomBytes(24).toString('base64url'),expiresAt=now+180_000;
  const req={subject,rpId,origin,authorizationRef,expiresAt};
  const message=service.signingMessage(req);
  const endorsements=[
    {approverId:'security-reviewer-a',signature:sign(null,message,a.privateKey).toString('base64url')},
    {approverId:'security-reviewer-b',signature:sign(null,message,b.privateKey).toString('base64url')}
  ];
  return {service,req,endorsements,rows,unknown:c};
}
test('two independent approver signatures produce a subject/RP-bound unspent approval',async()=>{
  const f=approvals();
  await f.service.acceptSignedApproval({...f.req,endorsements:f.endorsements});
  assert.equal((await f.service.verifyOperatorBootstrap({
    subject,rpId,origin,bootstrapEvidence:f.req.authorizationRef}))?.authorizationRef,f.req.authorizationRef);
  assert.equal(await f.service.verifyOperatorBootstrap({
    subject:'google:another-user',rpId,origin,bootstrapEvidence:f.req.authorizationRef}),null);
  assert.equal(await f.service.verifyOperatorBootstrap({
    subject,rpId:'evil.example.test',origin:'https://evil.example.test',
    bootstrapEvidence:f.req.authorizationRef}),null);
  f.rows.get(f.req.authorizationRef).consumed=true;
  assert.equal(await f.service.verifyOperatorBootstrap({
    subject,rpId,origin,bootstrapEvidence:f.req.authorizationRef}),null);
});
test('single approver, duplicate approver, tampering and unsigned payload fail closed',async()=>{
  const f=approvals();
  await assert.rejects(()=>f.service.acceptSignedApproval({...f.req,
    endorsements:[f.endorsements[0]]}),/invalid_approval/);
  await assert.rejects(()=>f.service.acceptSignedApproval({...f.req,
    endorsements:[f.endorsements[0],f.endorsements[0]]}),/approvers_required/);
  await assert.rejects(()=>f.service.acceptSignedApproval({...f.req,
    endorsements:f.endorsements,subject:'google:attacker'}),/invalid_signature/);
  await assert.rejects(()=>f.service.acceptSignedApproval({...f.req,
    endorsements:f.endorsements,expiresAt:now-1}),/invalid_approval/);
  await assert.rejects(()=>f.service.acceptSignedApproval({...f.req,
    endorsements:[f.endorsements[0],{...f.endorsements[1],signature:randomBytes(64).toString('base64url')}]}),/invalid_signature/);
});

test('separate approver aliases pointing at the same public key are forbidden',()=>{
  const one=makeKey();
  const approverKeys=new Map([
    ['security-reviewer-a',one.publicKey],
    ['security-reviewer-b',one.publicKey]
  ]);
  assert.throws(()=>createNeoKeyBootstrapApprovalService({approverKeys,store:{
    insertApproval:async()=>{},findValidApproval:async()=>null
  }}),/configuration_required/);
});
