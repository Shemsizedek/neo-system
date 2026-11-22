import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {createNeoKeyStagingIssuer} from './staging-issuer.mjs';
import {createNeoKeyBootstrapApprovalService} from './bootstrap-approval.mjs';

const now=1_900_000_000_000;
const subject='google:member-one',rpId='connect.example.test',origin='https://connect.example.test';
const makeKey=()=>generateKeyPairSync('ed25519');
const fingerprint=k=>createHash('sha256').update(k.export({format:'der',type:'spki'})).digest('base64url');

test('staging issuer requires trusted identity decision, authentic Ed25519 and unrevoked session',async()=>{
  const {privateKey,publicKey}=makeKey();
  let active=true, persistenceOnline=true;
  const sessions=new Map();
  const registerSession=async record=>{
    if(!persistenceOnline)throw Error('simulated_session_store_offline');
    if(sessions.has(record.jti))return false;
    sessions.set(record.jti,record);return true;
  };
  const isSessionActive=async ({subject,jti})=>
    persistenceOnline&&active&&sessions.get(jti)?.subject===subject;
  const issuer=createNeoKeyStagingIssuer({privateKey,publicKey,trustedPublicKeyFingerprint:fingerprint(publicKey),now:()=>now,
    authorizeSession:async ({subject,evidence})=>evidence==='trusted-server-proof'
      ? {approved:true,subject,method:'verified-identity'}:null,
    registerSession,isSessionActive});
  await assert.rejects(()=>issuer.issue({subject,evidence:{approved:true}}),/identity_approval_required/);
  const token=await issuer.issue({subject,evidence:'trusted-server-proof'});
  const claims=await issuer.verify(token);
  assert.equal(claims.sub,subject);
  assert.equal(claims.token_use,'neo-key-session');
  assert.ok(claims.exp-claims.iat<=300);
  assert.equal(await issuer.verify(token.slice(0,-2)+'aa'),null);
  const {publicKey:wrongPublicKey}=makeKey();
  assert.throws(()=>createNeoKeyStagingIssuer({privateKey,publicKey:wrongPublicKey,trustedPublicKeyFingerprint:fingerprint(wrongPublicKey),now:()=>now,
    authorizeSession:async()=>({approved:true,subject,method:'verified-identity'}),
    registerSession:async()=>true,isSessionActive:async()=>true}),
    /neo_key_staging_signer_pair_mismatch/);
  active=false;
  assert.equal(await issuer.verify(token),null);
  active=true;persistenceOnline=false;
  assert.equal(await issuer.verify(token),null);
  await assert.rejects(()=>issuer.issue({subject,evidence:'trusted-server-proof'}),
    /simulated_session_store_offline/);
});
test('issuer rejects unsupported keys and missing trusted callbacks',()=>{
  assert.throws(()=>createNeoKeyStagingIssuer(),/configuration_required/);
  const key=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  assert.throws(()=>createNeoKeyStagingIssuer({privateKey:key.privateKey,publicKey:key.publicKey,trustedPublicKeyFingerprint:fingerprint(key.publicKey),
    authorizeSession:()=>{},registerSession:()=>{},isSessionActive:()=>{}}),/configuration_required/);
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
  const custodianRecords=new Map([
    ['security-reviewer-a',{approverId:'security-reviewer-a',personId:'operator-alpha',
      status:'active',role:'neo-key-enrollment-approver',conflictOfInterest:false,
      signerFingerprint:fingerprint(a.publicKey)}],
    ['security-reviewer-b',{approverId:'security-reviewer-b',personId:'operator-beta',
      status:'active',role:'neo-key-enrollment-approver',conflictOfInterest:false,
      signerFingerprint:fingerprint(b.publicKey)}]
  ]);
  const verifyApproverCustody=async ({approverId})=>custodianRecords.get(approverId)??null;
  const service=createNeoKeyBootstrapApprovalService({
    approverKeys,store,verifyApproverCustody,now:()=>now});
  const authorizationRef=randomBytes(24).toString('base64url'),expiresAt=now+180_000;
  const req={subject,rpId,origin,authorizationRef,expiresAt};
  const message=service.signingMessage(req);
  const endorsements=[
    {approverId:'security-reviewer-a',signature:sign(null,message,a.privateKey).toString('base64url')},
    {approverId:'security-reviewer-b',signature:sign(null,message,b.privateKey).toString('base64url')}
  ];
  return {service,req,endorsements,rows,unknown:c,approverKeys,custodianRecords};
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
  },verifyApproverCustody:async()=>null}),/configuration_required/);
});

test('issuer rejects unpinned or mismatched external signer fingerprint',()=>{
  const {privateKey,publicKey}=makeKey();
  const opts={privateKey,publicKey,authorizeSession:async()=>({approved:true,subject,method:'verified-identity'}),
    registerSession:async()=>true,isSessionActive:async()=>true};
  assert.throws(()=>createNeoKeyStagingIssuer(opts),/configuration_required/);
  assert.throws(()=>createNeoKeyStagingIssuer({...opts,trustedPublicKeyFingerprint:fingerprint(makeKey().publicKey)}),
    /signer_fingerprint_mismatch/);
});

test('mutating approver allowlist after service creation cannot authorize new signer',async()=>{
  const f=approvals();
  f.approverKeys.set('security-reviewer-a',f.unknown.publicKey);
  const fake=f.endorsements.map(x=>({...x}));
  fake[0].signature=sign(null,f.service.signingMessage(f.req),f.unknown.privateKey).toString('base64url');
  await assert.rejects(()=>f.service.acceptSignedApproval({...f.req,endorsements:fake}),
    /neo_key_bootstrap_invalid_signature/);
  assert.equal(f.rows.size,0);
  await f.service.acceptSignedApproval({...f.req,endorsements:f.endorsements});
  assert.equal(f.rows.size,1);
});

test('two valid signing keys cannot impersonate a single human custodian',async()=>{
  const f=approvals();
  f.custodianRecords.set('security-reviewer-b',{
    ...f.custodianRecords.get('security-reviewer-b'),
    personId:'operator-alpha'
  });
  await assert.rejects(()=>f.service.acceptSignedApproval({...f.req,
    endorsements:f.endorsements}),/neo_key_bootstrap_custody_independence_required/);
  assert.equal(f.rows.size,0);
});

test('revoked, conflicted, self-approving and unpinned custodians cannot approve',async()=>{
  for(const changes of [
    {status:'revoked'},{conflictOfInterest:true},{personId:subject},
    {signerFingerprint:fingerprint(makeKey().publicKey)},
    {role:'untrusted-role'}]){
    const f=approvals();
    f.custodianRecords.set('security-reviewer-b',{
      ...f.custodianRecords.get('security-reviewer-b'),...changes
    });
    await assert.rejects(()=>f.service.acceptSignedApproval({...f.req,
      endorsements:f.endorsements}),/neo_key_bootstrap_custody_independence_required/);
    assert.equal(f.rows.size,0);
  }
});

test('custody registry outage denies approval before writing anything',async()=>{
  const keyA=makeKey(),keyB=makeKey();
  const approverKeys=new Map([
    ['security-reviewer-a',keyA.publicKey],['security-reviewer-b',keyB.publicKey]
  ]);
  let writes=0;
  const service=createNeoKeyBootstrapApprovalService({
    approverKeys,now:()=>now,
    store:{insertApproval:async()=>{writes++;},findValidApproval:async()=>null},
    verifyApproverCustody:async()=>{throw Error('custody_registry_offline');}
  });
  const req={subject,rpId,origin,authorizationRef:randomBytes(24).toString('base64url'),
    expiresAt:now+180_000};
  const m=service.signingMessage(req);
  const endorsements=[
    {approverId:'security-reviewer-a',signature:sign(null,m,keyA.privateKey).toString('base64url')},
    {approverId:'security-reviewer-b',signature:sign(null,m,keyB.privateKey).toString('base64url')}
  ];
  await assert.rejects(()=>service.acceptSignedApproval({...req,endorsements}),
    /custody_registry_offline/);
  assert.equal(writes,0);
});
