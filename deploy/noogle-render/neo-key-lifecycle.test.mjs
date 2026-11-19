import assert from 'node:assert/strict';
import test from 'node:test';
import {generateKeyPairSync} from 'node:crypto';
import {createNeoKeyLifecycle} from './neo-key-lifecycle.mjs';

const rpId='connect.example.test',origin=`https://${rpId}`;
const {publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const publicKeyPem=publicKey.export({type:'spki',format:'pem'});
const firstId='primary-key-one', backupId='backup-key-two';

function fixture({allow=true, bootstrap=false, preseed=false}={}) {
  let now=1000, proof=null, verifies=0;
  const subjects=new Map(), records=new Map(), keys=new Map();
  if(preseed){
    keys.set(firstId,{subject:'member-1',rpId,revoked:false});
    keys.set(backupId,{subject:'member-1',rpId,revoked:false});
  }
  const store={
    async getOrCreateUserHandle(subject,generated){if(!subjects.has(subject))subjects.set(subject,generated);return subjects.get(subject);},
    async insertRegistrationChallenge(data){records.set(data.challengeHash,{...data,consumed:false});},
    async registerAtomic(data){
      const r=records.get(data.challengeHash);
      if(!r || r.consumed || r.subject!==data.subject || r.rpId!==data.rpId ||
         r.origin!==data.origin || r.expiresAt<=data.now || keys.has(data.credentialId))return false;
      r.consumed=true;
      keys.set(data.credentialId,{subject:data.subject,rpId:data.rpId,revoked:false,publicKeyPem:data.publicKeyPem});
      return true;
    },
    async revokeAtomic(data){
      const active=[...keys.entries()].filter(([,v])=>v.subject===data.subject&&v.rpId===data.rpId&&!v.revoked);
      if(active.length<2 || data.targetCredentialId===data.backupCredentialId ||
         !active.some(([id])=>id===data.targetCredentialId) ||
         !active.some(([id])=>id===data.backupCredentialId))return false;
      keys.get(data.targetCredentialId).revoked=true;return true;
    }
  };
  const lifecycle=createNeoKeyLifecycle({rpId,origin,store,now:()=>now,
    resolveSessionSubject:async session=>session?.trusted===true?session.subject:null,
    authorizeEnrollment:async()=>allow?{allowed:true,method:bootstrap?'verified-operator-bootstrap':'verified-existing-passkey',authorizationRef:'server-ref-123'}:null,
    verifyRegistrationResponse:async ({response,expectedChallenge,expectedOrigin,expectedRPID})=>{
      verifies++;
      if(response.challenge!==expectedChallenge || expectedOrigin!==origin || expectedRPID!==rpId)return null;
      return response.proof;
    },
    verifyExistingAssertion:async()=>proof
  });
  return {lifecycle,session:{trusted:true,subject:'member-1'},records,keys,subjects,
    advance:ms=>{now+=ms;},setProof:value=>{proof=value;},verifications:()=>verifies};
}

const attestation=(challenge,changes={})=>({challenge,proof:{verified:true,userVerified:true,
  credentialId:'new-key-third',publicKeyPem,signCount:0,algorithm:-7,...changes}});

test('registration is session/step-up bound, stable opaque user handle and one-use',async()=>{
  const f=fixture({bootstrap:true});
  const a=await f.lifecycle.beginRegistration({session:f.session});
  const b=await f.lifecycle.beginRegistration({session:f.session});
  assert.equal(a.publicKey.rp.id,rpId);
  assert.equal(a.publicKey.user.id,b.publicKey.user.id);
  assert.equal(a.publicKey.user.id.length,43);
  assert.equal(a.publicKey.authenticatorSelection.userVerification,'required');
  assert.equal([...f.records.values()][0].method,'verified-operator-bootstrap');
  const result=await f.lifecycle.finishRegistration({session:f.session,challenge:a.publicKey.challenge,response:attestation(a.publicKey.challenge)});
  assert.deepEqual(result,{registered:true,credentialId:'new-key-third',permissionGranted:false});
  await assert.rejects(()=>f.lifecycle.finishRegistration({session:f.session,challenge:a.publicKey.challenge,response:attestation(a.publicKey.challenge)}),/neo_key_registration_rejected/);
  assert.equal(f.keys.size,1);
});

test('missing session or authorized step-up fails before issuing challenge',async()=>{
  const f=fixture({allow:false});
  await assert.rejects(()=>f.lifecycle.beginRegistration({session:f.session}),/neo_key_enrollment_authorization_required/);
  await assert.rejects(()=>f.lifecycle.beginRegistration({session:{subject:'member-1'}}),/neopass_session_required/);
  assert.equal(f.records.size,0);
});

test('invalid attestation, mismatched challenge and expired ceremony do not register',async()=>{
  const f=fixture();const {publicKey:{challenge}}=await f.lifecycle.beginRegistration({session:f.session});
  await assert.rejects(()=>f.lifecycle.finishRegistration({session:f.session,challenge,response:attestation(challenge,{userVerified:false})}),/neo_key_registration_verification_failed/);
  await assert.rejects(()=>f.lifecycle.finishRegistration({session:f.session,challenge,response:attestation('A'.repeat(43))}),/neo_key_registration_verification_failed/);
  await assert.rejects(()=>f.lifecycle.finishRegistration({session:f.session,challenge,response:attestation(challenge,{algorithm:-257})}),/neo_key_registration_verification_failed/);
  assert.equal(f.keys.size,0);
  f.advance(120001);
  await assert.rejects(()=>f.lifecycle.finishRegistration({session:f.session,challenge,response:attestation(challenge)}),/neo_key_registration_rejected/);
  assert.equal(f.keys.size,0);
});

test('lost-key revocation requires distinct valid existing backup and preserves a key',async()=>{
  const f=fixture({preseed:true});
  f.setProof({subject:'member-1',credentialId:backupId});
  assert.deepEqual(await f.lifecycle.revokeLostCredential({session:f.session,targetCredentialId:firstId,backupAssertion:{signed:true}}),
    {revoked:true,credentialId:firstId,permissionGranted:false});
  assert.equal(f.keys.get(firstId).revoked,true);
  f.setProof({subject:'member-1',credentialId:firstId});
  await assert.rejects(()=>f.lifecycle.revokeLostCredential({session:f.session,targetCredentialId:backupId,backupAssertion:{signed:true}}),/neo_key_recovery_rejected/);
  assert.equal(f.keys.get(backupId).revoked,false);
});

test('cannot revoke with unverified session, wrong owner or same key',async()=>{
  const f=fixture({preseed:true});
  f.setProof({subject:'attacker',credentialId:backupId});
  await assert.rejects(()=>f.lifecycle.revokeLostCredential({session:f.session,targetCredentialId:firstId,backupAssertion:{signed:true}}),/neo_key_recovery_requires_backup/);
  f.setProof({subject:'member-1',credentialId:firstId});
  await assert.rejects(()=>f.lifecycle.revokeLostCredential({session:f.session,targetCredentialId:firstId,backupAssertion:{signed:true}}),/neo_key_recovery_requires_backup/);
  await assert.rejects(()=>f.lifecycle.revokeLostCredential({session:{trusted:false,subject:'member-1'},targetCredentialId:firstId,backupAssertion:{signed:true}}),/neopass_session_required/);
  assert.equal(f.keys.get(firstId).revoked,false);
});

test('configuration without trusted adapters or persistent atomic store fails closed',()=>{
  assert.throws(()=>createNeoKeyLifecycle({rpId,origin}),/neo_key_lifecycle_configuration_required/);
  assert.throws(()=>createNeoKeyLifecycle({rpId,origin:'http://connect.example.test'}),/neo_key_lifecycle_configuration_required/);
});
