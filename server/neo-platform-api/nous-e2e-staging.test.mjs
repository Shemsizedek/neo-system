import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import { createGoogleNeopassAuth } from './neopass-google-auth.mjs';
import { createNousConsentIntentHandler } from './nous-consent-intent.mjs';
import { createNousConsentHandler } from './nous-consent.mjs';
import { createNousTokenExchange } from './nous-token-exchange.mjs';
import { createNousMembershipGuard } from './nous-membership-guard.mjs';
import { createIdentityVerifier } from '../../core/nous-os/identity.mjs';
import { createNousRuntime } from '../../core/nous-os/runtime.mjs';

const now = 1780000000000, epoch = Math.floor(now / 1000);
const secret = 'test-only-no-production-session-credentials';
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const pem = privateKey.export({ format:'pem', type:'pkcs8' });
const publicPem = publicKey.export({ format:'pem', type:'spki' });
const subject = 'google:staging-fixture-1';
function makeRegistry() {
  let record = { subject, email:'fixture@example.test', displayName:'Staging Example', role:'member', status:'active', nousAccessEnabled:false, username:'fixture' };
  return {
    async getNEOpassCredential(id) { return id === subject ? {...record} : null; },
    async upsert(collection, updates) {
      if (collection !== 'neopassCredentials' || updates.subject !== subject) throw Error('unexpected_upsert');
      record = {...record,...updates}; return {...record};
    },
    async setNEOpassNousAccess(id, { enabled, sessionIssuedAt, nowEpochSeconds }) {
      if (id !== subject || record.status !== 'active') throw Object.assign(Error('nous_member_not_active'),{code:'nous_member_not_active'});
      if (record.sessionRevokedAfter !== undefined && sessionIssuedAt <= record.sessionRevokedAfter)
        throw Object.assign(Error('neopass_session_revoked'),{code:'neopass_session_revoked'});
      record = {...record, nousAccessEnabled:enabled, nousAccessExpiresAt:enabled?new Date((nowEpochSeconds+86400)*1000).toISOString():null,
        ...(!enabled?{sessionRevokedAfter:nowEpochSeconds}:{})};
      return {...record};
    },
  };
}
async function serve(handlers, callback) {
  const server = createServer(async (req,res) => {
    const url = new URL(req.url, 'https://egov.holytemples.org');
    for (const handler of handlers) { if(await handler(req,res,url)) return; }
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try { await callback('http://127.0.0.1:'+server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
async function call(base,path,{cookie,bearer,method='GET',body}={}){
  const res=await fetch(base+path,{method,headers:{
    ...(cookie?{cookie:'neo_pass_session='+cookie}:{}),
    ...(bearer?{authorization:'Bearer '+bearer}:{}),
    ...(body?{'content-type':'application/json'}:{}),
    'sec-fetch-site':'same-origin',
  },body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json().catch(()=>({}))};
}

test('isolated OAuth simulation proves consent and token exchange through real NEOpass handlers',async()=>{
  const registry=makeRegistry();
  const authService=createGoogleNeopassAuth({
    clientId:'staging-only-client',jwtSecret:secret,jwtIssuer:'neo-pass',registry,
    executiveAdminEmail:'unmatched@example.invalid',
    verifyGoogleCredential:async credential=>{
      if(credential!=='staging-verified-google-proof') throw Error('invalid_google_credential');
      return {sub:'staging-fixture-1',email:'fixture@example.test',email_verified:true,name:'Staging Example'};
    },now:()=>now,
  });
  const intent=createNousConsentIntentHandler({jwtSecret:secret,registry,now:()=>now});
  const consent=createNousConsentHandler({jwtSecret:secret,registry,now:()=>now});
  const exchange=createNousTokenExchange({jwtSecret:secret,jwtIssuer:'neo-pass',privateKeyPem:pem,tokenIssuer:'neo-pass-nous-exchange',audience:'neo-nous',
    authService,membershipGuard:createNousMembershipGuard({getCredential: id=>registry.getNEOpassCredential(id),now:()=>now}),now:()=>now,signingKeyId:'staging-only-v1'});
  const verifier=createIdentityVerifier({verificationKeys:[{kid:'staging-only-v1',publicKeyPem:publicPem}],issuer:'neo-pass-nous-exchange',audience:'neo-nous',tokenUse:'nous-read',maxLifetimeSeconds:120,now:()=>now});
  const runtime=createNousRuntime({identityVerifier:verifier});
  await serve([intent,consent,exchange],async base=>{
    const loggedIn=await authService.login('staging-verified-google-proof');
    assert.equal(loggedIn.member.neopassStatus,'active');
    const session=loggedIn.token;
    assert.equal((await call(base,'/api/v1/auth/nous-token',{bearer:session,method:'POST'})).status,403,'opt-out must deny token issuance');
    const intentResponse=await call(base,'/api/v1/auth/nous-consent/intent',{cookie:session});
    assert.equal(intentResponse.status,200);
    const temp=intentResponse.data.token;
    assert.equal((await call(base,'/api/v1/auth/nous-consent/status',{bearer:temp})).data.nousAccessEnabled,false);
    const grant=await call(base,'/api/v1/auth/nous-consent/grant',{bearer:temp,method:'POST',body:{acknowledge:'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS'}});
    assert.equal(grant.status,200);
    assert.equal(grant.data.nousAccessEnabled,true);
    const tokenExchange=await call(base,'/api/v1/auth/nous-token',{bearer:session,method:'POST'});
    assert.equal(tokenExchange.status,200);
    const nousToken=tokenExchange.data.token;
    const agents=runtime.listAgents('Bearer '+nousToken);
    assert.ok(agents.agents.length>=5);
    assert.equal(runtime.listSources('Bearer '+nousToken).sources.length,3);
    assert.throws(()=>runtime.plan('Bearer '+nousToken,{requestId:'NOUS-NO-WRITES',agentId:'NIA-008',capability:'project.plan'}),/scope_denied/);
    const revoke=await call(base,'/api/v1/auth/nous-consent/revoke',{bearer:temp,method:'POST'});
    assert.equal(revoke.status,200);
    assert.equal(revoke.data.nousAccessEnabled,false);
    assert.equal((await call(base,'/api/v1/auth/nous-token',{bearer:session,method:'POST'})).status,403);
    assert.equal((await call(base,'/api/v1/auth/nous-consent/intent',{cookie:session})).status,403);
    assert.equal(runtime.listAgents('Bearer '+nousToken).agents.length>0,true,'prior read-only token can remain valid until expiry');
    const revokedVerifier=createIdentityVerifier({verificationKeys:[{kid:'staging-only-v1',publicKeyPem:publicPem}],revokedKeyIds:['staging-only-v1'],
      issuer:'neo-pass-nous-exchange',audience:'neo-nous',tokenUse:'nous-read',maxLifetimeSeconds:120,now:()=>now});
    assert.throws(()=>revokedVerifier.verifyAuthorization('Bearer '+nousToken),/key_revoked/);
  });
});
