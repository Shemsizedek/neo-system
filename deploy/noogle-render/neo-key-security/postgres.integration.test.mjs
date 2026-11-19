import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createPostgresNeoKeyStore} from '../neo-key-postgres-store.mjs';
import {createPostgresNeoKeyAssertionStore} from './postgres-assertion-store.mjs';
import {randomBytes,createHash,generateKeyPairSync,sign} from 'node:crypto';
import {createNeoKeyStagingIssuer} from './staging-issuer.mjs';
import {createNeoKeyBootstrapApprovalService} from './bootstrap-approval.mjs';
import {createPostgresNeoKeyApprovalStore} from './postgres-approval-store.mjs';
import {createNeoKeyStagingAdapter} from './staging-adapter.mjs';
import {createSoftwareAuthenticator} from './staging-fixtures.mjs';

// Never auto-connect to Neon, Render or a production DSN.
// This module requires an explicitly named ephemeral, loopback CI DB.
const connectionString=process.env.NEO_KEY_EPHEMERAL_POSTGRES_URL;
if (!connectionString) {
  test('isolated PostgreSQL integration requires ephemeral service', {skip:true},()=>{});
} else {
  test('real PostgreSQL enforces bootstrap, concurrent replay and last-key protection',async()=>{
    const url=new URL(connectionString);
    assert.equal(url.hostname,'127.0.0.1');
    assert.equal(url.pathname,'/neo_key_gate4');
    const pool=new pg.Pool({connectionString,max:8,connectionTimeoutMillis:5000});
    try {
      const schema=await readFile(new URL('../sql/003_neo_key_credentials.sql',import.meta.url),'utf8');
      await pool.query(schema);
      const store=createPostgresNeoKeyStore(pool);
      const subject=`test-${randomBytes(8).toString('hex')}`;
      const rpId='connect.example.test',origin=`https://${rpId}`,now=Date.now();
      const user=await store.getOrCreateUserHandle(subject,randomBytes(32).toString('base64url'));
      assert.equal(user.length,43);
      assert.equal(await store.getOrCreateUserHandle(subject,randomBytes(32).toString('base64url')),user);
      async function challenge(method,ref){
        const hash=createHash('sha256').update(randomBytes(32)).digest('hex');
        await store.insertRegistrationChallenge({subject,rpId,origin,
          challengeHash:hash,expiresAt:now+120000,method,authorizationRef:`${subject}-${ref}`});
        return {subject,rpId,origin,challengeHash:hash,now,credentialId:`key-${ref}-${randomBytes(5).toString('hex')}`,publicKeyPem:'TEST ONLY PUBLIC KEY',publicKeyCose:Buffer.alloc(80,2).toString('base64url'),signCount:0};
      }
      const invalid=await challenge('verified-existing-passkey','invalid');
      assert.equal(await store.registerAtomic(invalid),false);
      const bootstrap=await challenge('verified-operator-bootstrap','bootstrap');
      await pool.query(`INSERT INTO neo_key_bootstrap_approvals
        (authorization_ref,subject_id,rp_id,origin,expires_at,approver_one,approver_two)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [`${subject}-bootstrap`,subject,rpId,origin,now+120000,
          'security-reviewer-a','security-reviewer-b']);
      const [x,y]=await Promise.all([store.registerAtomic(bootstrap),store.registerAtomic(bootstrap)]);
      assert.deepEqual([x,y].sort(),[false,true]);
      const secondBootstrap=await challenge('verified-operator-bootstrap','rebootstrap');
      assert.equal(await store.registerAtomic(secondBootstrap),false);
      const secondary=await challenge('verified-existing-passkey','secondary');
      assert.equal(await store.registerAtomic(secondary),true);
      const rows=await pool.query('SELECT credential_id FROM neo_key_credentials WHERE subject_id=$1 AND revoked_at IS NULL',[subject]);
      assert.equal(rows.rows.length,2);
      const [r1,r2]=await Promise.all([
        store.revokeAtomic({subject,rpId,targetCredentialId:bootstrap.credentialId,backupCredentialId:secondary.credentialId,now:now+1}),
        store.revokeAtomic({subject,rpId,targetCredentialId:bootstrap.credentialId,backupCredentialId:secondary.credentialId,now:now+1})
      ]);
      assert.deepEqual([r1,r2].sort(),[false,true]);
      assert.equal(await store.revokeAtomic({subject,rpId,targetCredentialId:secondary.credentialId,backupCredentialId:bootstrap.credentialId,now:now+2}),false);
      const remaining=await pool.query('SELECT credential_id FROM neo_key_credentials WHERE subject_id=$1 AND revoked_at IS NULL',[subject]);
      assert.deepEqual(remaining.rows.map(v=>v.credential_id),[secondary.credentialId]);
      const audited=await pool.query('SELECT event_type FROM neo_key_audit_events WHERE subject_id=$1 ORDER BY event_id',[subject]);
      assert.deepEqual(audited.rows.map(v=>v.event_type),['enrolled','enrolled','revoked']);
    }finally{await pool.end();}
  });
  test('real PostgreSQL consumes assertions once and guards atomic counters across clients',async()=>{
    const url=new URL(connectionString);
    assert.equal(url.hostname,'127.0.0.1');
    assert.equal(url.pathname,'/neo_key_gate4');
    const pool=new pg.Pool({connectionString,max:8,connectionTimeoutMillis:5000});
    try {
      const schema=await readFile(new URL('../sql/003_neo_key_credentials.sql',import.meta.url),'utf8');
      await pool.query(schema);
      const credentialStore=createPostgresNeoKeyStore(pool);
      const store=createPostgresNeoKeyAssertionStore(pool);
      const subject=`assertion-${randomBytes(8).toString('hex')}`;
      const rpId='connect.example.test',origin=`https://${rpId}`;
      const credentialId=randomBytes(24).toString('base64url');
      const now=Date.now();
      await credentialStore.getOrCreateUserHandle(subject,randomBytes(32).toString('base64url'));
      await pool.query(`INSERT INTO neo_key_credentials(credential_id,subject_id,rp_id,public_key_pem,public_key_cose,sign_count,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [credentialId,subject,rpId,'TEST PUBLIC KEY',Buffer.alloc(80,1).toString('base64url'),0,now]);
      assert.equal((await store.getActiveCredential(credentialId))?.signCount,0);
      async function makeChallenge(label){
        const challengeHash=createHash('sha256').update(randomBytes(32)).digest('hex');
        await store.insertAuthenticationChallenge({challengeHash,subject,credentialId,rpId,origin,expiresAt:now+120000});
        return {challengeHash,subject,credentialId,rpId,origin,now,
          action:'authenticate',targetCredentialId:null,newCounter:0,label};
      }
      const a=await makeChallenge('zero');
      assert.equal((await store.getPendingAuthenticationChallenge(a))?.action,'authenticate');
      const [first,second]=await Promise.all([
        store.confirmAuthenticationAtomic(a),
        store.confirmAuthenticationAtomic(a)
      ]);
      assert.deepEqual([first,second].sort(),[false,true]);
      assert.equal((await store.getActiveCredential(credentialId)).signCount,0);
      const b=await makeChallenge('increase');
      assert.equal(await store.confirmAuthenticationAtomic({...b,newCounter:1}),true);
      assert.equal((await store.getActiveCredential(credentialId)).signCount,1);
      const c=await makeChallenge('regression');
      assert.equal(await store.confirmAuthenticationAtomic({...c,newCounter:1}),false);
      assert.equal((await store.getPendingAuthenticationChallenge(c))?.action,'authenticate');
      const d=await makeChallenge('higher');
      assert.equal(await store.confirmAuthenticationAtomic({...d,newCounter:2}),true);
      const e=await makeChallenge('wrong-owner');
      assert.equal(await store.confirmAuthenticationAtomic({...e,subject:'attacker',newCounter:3}),false);
      assert.equal((await store.getActiveCredential(credentialId)).signCount,2);
      await pool.query('UPDATE neo_key_credentials SET revoked_at=$2 WHERE credential_id=$1',[credentialId,now+10]);
      const z=await makeChallenge('revoked');
      assert.equal(await store.confirmAuthenticationAtomic({...z,newCounter:3}),false);
      assert.equal(await store.getActiveCredential(credentialId),null);
    }finally{await pool.end();}
  });
  test('full isolated NEOpass + WebAuthn primary, backup, recovery and replay chain',async()=>{
    const url=new URL(connectionString);
    assert.equal(url.hostname,'127.0.0.1');
    assert.equal(url.pathname,'/neo_key_gate4');
    const pool=new pg.Pool({connectionString,max:8,connectionTimeoutMillis:5000});
    try {
      await pool.query(await readFile(new URL('../sql/003_neo_key_credentials.sql',import.meta.url),'utf8'));
      const subject=`google:lab-${randomBytes(6).toString('hex')}`;
      const rpId='connect.example.test',origin=`https://${rpId}`,now=Date.now();
      let registryOnline=true,sessionActive=true;
      const getAuthoritativeAccount=async id=>{
        if(!registryOnline)throw Error('simulated_registry_failure');
        return id===subject?{subject:id,status:'active',provider:'google'}:null;
      };
      const issuerKeys=generateKeyPairSync('ed25519');
      const issuer=createNeoKeyStagingIssuer({
        ...issuerKeys, now:()=>now,
        authorizeSession:async ({subject:requested,evidence})=>
          requested===subject && evidence==='verified-test-identity'
            ? {approved:true,subject:requested,method:'verified-identity'}:null,
        isSessionActive:async()=>sessionActive
      });
      const session={token:await issuer.issue({subject,evidence:'verified-test-identity'})};
      const verifyIssuerToken=token=>issuer.verify(token);
      const signerA=generateKeyPairSync('ed25519');
      const signerB=generateKeyPairSync('ed25519');
      const approverKeys=new Map([
        ['security-reviewer-a',signerA.publicKey],
        ['security-reviewer-b',signerB.publicKey]
      ]);
      const approvals=createNeoKeyBootstrapApprovalService({
        approverKeys,store:createPostgresNeoKeyApprovalStore(pool),now:()=>now
      });
      const approvalReq={subject,rpId,origin,
        authorizationRef:randomBytes(24).toString('base64url'),
        expiresAt:now+120000};
      const approvalMessage=approvals.signingMessage(approvalReq);
      const endorsements=[
        {approverId:'security-reviewer-a',
          signature:sign(null,approvalMessage,signerA.privateKey).toString('base64url')},
        {approverId:'security-reviewer-b',
          signature:sign(null,approvalMessage,signerB.privateKey).toString('base64url')}
      ];
      await approvals.acceptSignedApproval({...approvalReq,endorsements});
      const bootstrapEvidence=approvalReq.authorizationRef;
      const verifyOperatorBootstrap=input=>approvals.verifyOperatorBootstrap(input);
      const staging=createNeoKeyStagingAdapter({enabled:true,rpId,origin,pool,
        verifyIssuerToken,getAuthoritativeAccount,verifyOperatorBootstrap,now:()=>now});
      const primary=createSoftwareAuthenticator(rpId),backup=createSoftwareAuthenticator(rpId);

      // Absent or forged bootstrap authorization never grants first enrollment.
      await assert.rejects(()=>staging.beginRegistration({session,bootstrapEvidence:'forged'}),/neo_key_enrollment_authorization_required/);
      await assert.rejects(()=>staging.beginRegistration({
        session:{token:session.token+'tampered'},bootstrapEvidence
      }),/neopass_session_required/);
      const initial=await staging.beginRegistration({session,bootstrapEvidence});
      assert.equal((await staging.finishRegistration({session,
        challenge:initial.publicKey.challenge,
        response:primary.registration(initial.publicKey.challenge)})).registered,true);

      // Reusing first-key bootstrap is blocked even if the separate operator
      // ticket is valid. Secondary requires a new primary-key signature.
      await assert.rejects(()=>staging.beginRegistration({session,bootstrapEvidence}),
        /neo_key_enrollment_authorization_required/);

      const step=await staging.beginEnrollmentStepUp({session,credentialId:primary.id});
      assert.ok(step?.publicKey.challenge);
      const second=await staging.beginRegistration({session,
        stepUpResponse:primary.assertion(step.publicKey.challenge,{counter:1})});
      assert.equal((await staging.finishRegistration({session,
        challenge:second.publicKey.challenge,
        response:backup.registration(second.publicKey.challenge)})).registered,true);

      const before=await pool.query('SELECT credential_id FROM neo_key_credentials WHERE subject_id=$1 AND revoked_at IS NULL',[subject]);
      assert.deepEqual(new Set(before.rows.map(x=>x.credential_id)),new Set([primary.id,backup.id]));

      // A normal signed authentication challenge is not sufficient to revoke.
      const normal=await staging.beginAuthentication({session,credentialId:backup.id});
      await assert.rejects(()=>staging.finishRecovery({session,targetCredentialId:primary.id,
        response:backup.assertion(normal.publicKey.challenge,{counter:1})}),/neo_key_recovery_requires_backup/);
      // Fresh, explicit target-bound recovery challenge.
      const recovery=await staging.beginRecovery({session,backupCredentialId:backup.id,targetCredentialId:primary.id});
      assert.ok(recovery?.publicKey.challenge);
      assert.equal(await staging.beginRecovery({session,backupCredentialId:backup.id,targetCredentialId:backup.id}),null);
      const signed=backup.assertion(recovery.publicKey.challenge,{counter:2});
      await assert.rejects(()=>staging.finishRecovery({session,targetCredentialId:'wrong-target-key',
        response:signed}),/neo_key_recovery_requires_backup/);
      // A correctly signed but wrong-target attempt consumes its challenge,
      // preventing the same signed response from authorizing a later revoke.
      await assert.rejects(()=>staging.finishRecovery({session,targetCredentialId:primary.id,
        response:signed}),/neo_key_recovery_requires_backup/);
      const secondRecovery=await staging.beginRecovery({session,backupCredentialId:backup.id,targetCredentialId:primary.id});
      const signedAgain=backup.assertion(secondRecovery.publicKey.challenge,{counter:3});
      assert.equal((await staging.finishRecovery({session,targetCredentialId:primary.id,
        response:signedAgain})).revoked,true);
      await assert.rejects(()=>staging.finishRecovery({session,targetCredentialId:primary.id,
        response:signedAgain}),/neo_key_recovery_requires_backup/);
      assert.equal(await staging.beginEnrollmentStepUp({session,credentialId:primary.id}),null);
      assert.equal(await staging.beginRecovery({session,backupCredentialId:primary.id,targetCredentialId:backup.id}),null);
      const remaining=await pool.query('SELECT credential_id FROM neo_key_credentials WHERE subject_id=$1 AND revoked_at IS NULL',[subject]);
      assert.deepEqual(remaining.rows.map(x=>x.credential_id),[backup.id]);
      sessionActive=false;
      assert.equal(await staging.beginEnrollmentStepUp({session,credentialId:backup.id}),null);
      sessionActive=true;
      registryOnline=false;
      assert.equal(await staging.beginRecovery({session,backupCredentialId:backup.id,targetCredentialId:primary.id}),null);
    }finally{await pool.end();}
  });

}

