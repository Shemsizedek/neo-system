// Opt-in stacked integration, never invoked without separate local NEO Key checkout
// and an approved disposable loopback PostgreSQL database. No servers launched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createIsolatedPostgresAuthenticator} from './staging-postgres-app.mjs';

const dbUrl=process.env.NEOPASS_GATE6_POSTGRES_URL;
const keyDir=process.env.NEO_KEY_SECURITY_DIR;
const isolated=process.env.NEOPASS_GATE6_ISOLATED==='1';
const permitted=(()=>{
  try {
    const u=new URL(dbUrl);
    return isolated && isAbsolute(keyDir??'') &&
      ['postgres:','postgresql:'].includes(u.protocol) &&
      u.hostname==='127.0.0.1' && u.pathname==='/neo_key_gate6' &&
      !u.searchParams.has('host');
  }catch{return false;}
})();
test('Gate 6: actual NEO Key WebAuthn cryptography + app HTTP + disposable PostgreSQL', {
  skip:!permitted && 'requires NEO_KEY_SECURITY_DIR and approved isolated loopback neo_key_gate6 PostgreSQL'
},async()=>{
  const key=async name=>(await import(pathToFileURL(join(keyDir,name)).href));
  const {Pool}=createRequire(join(keyDir,'package.json'))('pg');
  const [{createNeoKeyStagingAdapter},{createNeoKeyStagingIssuer},
    {createPostgresNeoKeySessionStore},{createNeoKeyBootstrapApprovalService},
    {createPostgresNeoKeyApprovalStore},{createSoftwareAuthenticator}]=await Promise.all([
    key('staging-adapter.mjs'),key('staging-issuer.mjs'),
    key('postgres-session-store.mjs'),key('bootstrap-approval.mjs'),
    key('postgres-approval-store.mjs'),key('staging-fixtures.mjs')
  ]);
  const pool=new Pool({connectionString:dbUrl,max:8,connectionTimeoutMillis:5000});
  const rpId='connect.example.test',origin='https://'+rpId,now=Date.now();
  const subject='google:gate6-'+randomBytes(8).toString('hex');
  const sessionKey=randomBytes(24).toString('base64url');
  const csrfToken='gate6-test-csrf';
  const fingerprint=key=>createHash('sha256').update(
    key.export({format:'der',type:'spki'})).digest('base64url');
  const testKey=()=>generateKeyPairSync('ed25519');
  let session,bootstrapEvidence,enrollmentStep=null,activeCredentialId=null;
  try {
    await pool.query(await readFile(join(keyDir,'..','sql','003_neo_key_credentials.sql'),'utf8'));
    await pool.query(await readFile(new URL('./sql/004_neopass_staging_ceremonies.sql',import.meta.url),'utf8'));
    await pool.query('TRUNCATE neopass_staging_ceremonies');
    const sessions=createPostgresNeoKeySessionStore(pool);
    const issuerKey=testKey();
    const issuer=createNeoKeyStagingIssuer({
      ...issuerKey,trustedPublicKeyFingerprint:fingerprint(issuerKey.publicKey),
      now:()=>now,
      authorizeSession:async({subject:requested,evidence})=>
        requested===subject&&evidence==='synthetic-trusted-identity'?
          {approved:true,subject:requested,method:'verified-identity'}:null,
      registerSession:p=>sessions.registerSession(p),
      isSessionActive:p=>sessions.isSessionActive(p)
    });
    const signerA=testKey(),signerB=testKey();
    const approverKeys=new Map([['lab-approver-a',signerA.publicKey],
      ['lab-approver-b',signerB.publicKey]]);
    const custody=new Map([
      ['lab-approver-a',{approverId:'lab-approver-a',personId:'gate6-operator-a',
        status:'active',role:'neo-key-enrollment-approver',
        conflictOfInterest:false,signerFingerprint:fingerprint(signerA.publicKey)}],
      ['lab-approver-b',{approverId:'lab-approver-b',personId:'gate6-operator-b',
        status:'active',role:'neo-key-enrollment-approver',
        conflictOfInterest:false,signerFingerprint:fingerprint(signerB.publicKey)}]
    ]);
    const approvals=createNeoKeyBootstrapApprovalService({
      approverKeys,store:createPostgresNeoKeyApprovalStore(pool),
      verifyApproverCustody:async({approverId})=>custody.get(approverId)??null,
      now:()=>now
    });
    const approval={subject,rpId,origin,
      authorizationRef:randomBytes(24).toString('base64url'),expiresAt:now+120000};
    const message=approvals.signingMessage(approval);
    await approvals.acceptSignedApproval({...approval,endorsements:[
      {approverId:'lab-approver-a',signature:sign(null,message,signerA.privateKey).toString('base64url')},
      {approverId:'lab-approver-b',signature:sign(null,message,signerB.privateKey).toString('base64url')}
    ]});
    bootstrapEvidence=approval.authorizationRef;
    session={token:await issuer.issue({subject,evidence:'synthetic-trusted-identity'})};
    const staging=createNeoKeyStagingAdapter({
      enabled:true,rpId,origin,pool,verifyIssuerToken:token=>issuer.verify(token),
      getAuthoritativeAccount:async id=>id===subject?{subject:id,status:'active',provider:'google'}:null,
      verifyOperatorBootstrap:input=>approvals.verifyOperatorBootstrap(input),now:()=>now
    });
    const http=createIsolatedPostgresAuthenticator({
      enabled:true,pool,hmacKey:randomBytes(32),rpId,origin,now:()=>now,staging,
      authenticateRequest:async()=>({subject,sessionKey,session}),
      verifyCsrf:async({token})=>token===csrfToken,
      takeRateLimit:async()=>true,
      lookupCredentialId:async()=>activeCredentialId,
      authorizeEnrollment:async()=>enrollmentStep?
        {allowed:true,stepUpResponse:enrollmentStep}:
        {allowed:true,bootstrapEvidence}
    });
    async function post(path,body={}){
      const request=new Request(origin+'/api/neopass/authenticator/'+path,{
        method:'POST',headers:{Origin:origin,'X-CSRF-Token':csrfToken,
          'Content-Type':'application/json'},body:JSON.stringify(body)
      });
      const res=await http(request);
      return {status:res.status,json:await res.json()};
    }
    const primary=createSoftwareAuthenticator(rpId);
    const registration=await post('registration/options');
    assert.equal(registration.status,200,JSON.stringify(registration.json));
    const first=await post('registration/verify',{
      credential:primary.registration(registration.json.publicKey.challenge)
    });
    assert.equal(first.status,200,JSON.stringify(first.json));
    assert.equal(first.json.permissionGranted,false);
    const replay=await post('registration/verify',{
      credential:primary.registration(registration.json.publicKey.challenge)
    });
    assert.equal(replay.status,403);
    activeCredentialId=primary.id;
    const login=await post('authentication/options');
    assert.equal(login.status,200,JSON.stringify(login.json));
    const assertion=primary.assertion(login.json.publicKey.challenge,{counter:1});
    const results=await Promise.all([
      post('authentication/verify',{credential:assertion}),
      post('authentication/verify',{credential:assertion})
    ]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,403]);
    assert.equal(results.find(r=>r.status===200)?.json?.permissionGranted,false);
    // Add backup with a distinct step-up assertion, not a general login proof.
    const step=await staging.beginEnrollmentStepUp({session,credentialId:primary.id});
    assert.ok(step?.publicKey.challenge);
    enrollmentStep=primary.assertion(step.publicKey.challenge,{counter:2});
    const backup=createSoftwareAuthenticator(rpId);
    const secondRegistration=await post('registration/options');
    assert.equal(secondRegistration.status,200,JSON.stringify(secondRegistration.json));
    const second=await post('registration/verify',{
      credential:backup.registration(secondRegistration.json.publicKey.challenge)
    });
    assert.equal(second.status,200,JSON.stringify(second.json));
    // Revocation uses NEO Key's target-bound recovery; HTTP recovery routes are
    // not exposed by the NEOpass app and do not create a privileged session.
    const recovery=await staging.beginRecovery({
      session,backupCredentialId:backup.id,targetCredentialId:primary.id});
    assert.ok(recovery?.publicKey.challenge);
    assert.equal((await staging.finishRecovery({
      session,targetCredentialId:primary.id,
      response:backup.assertion(recovery.publicKey.challenge,{counter:1})
    })).revoked,true);
    assert.equal(await issuer.verify(session.token),null);
    assert.equal(await staging.beginAuthentication({session,credentialId:primary.id}),null);
  }finally {
    // Guaranteed isolated disposable DB; never reference a persistent NEO DB.
    await pool.query('DROP TABLE IF EXISTS neopass_staging_ceremonies');
    await pool.end();
  }
});
