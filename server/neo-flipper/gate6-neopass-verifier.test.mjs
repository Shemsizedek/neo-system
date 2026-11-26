import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createGate6NeopassVerifier } from './gate6-neopass-verifier.mjs';

const NOW=Date.parse('2026-11-21T08:47:00Z');
const SECRET='neo-flipper-local-test-secret-with-32-plus-bytes';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function issue(payload={},header={}) {
  const h=encode({alg:'HS256',typ:'JWT',...header});
  const p=encode({iss:'neo-pass',aud:'neo-flipper-staging',active:true,
    sub:'neopass:test-operator',jti:'test-token-001',
    iat:Math.floor(NOW/1000)-10,exp:Math.floor(NOW/1000)+120,
    scopes:['buyer:read','buyer:write'],...payload});
  return h+'.'+p+'.'+createHmac('sha256',SECRET).update(h+'.'+p).digest('base64url');
}
const base=(patch={})=>createGate6NeopassVerifier({
  secret:SECRET,clock:()=>NOW,
  isRevoked:async()=>false,
  getCurrentAccess:async()=>({active:true,scopes:['buyer:read','buyer:write']}),
  ...patch
});
test('requires secret and independent revocation and active membership adapters',()=>{
  assert.throws(()=>createGate6NeopassVerifier({secret:'short'}),/staging_issuer_secret_required/);
  assert.throws(()=>createGate6NeopassVerifier({secret:SECRET}),/trusted_access_and_revocation_adapters_required/);
});
test('accepts properly signed, short lived, issuer/audience bound access',async()=>{
  const x=await base()(issue());
  assert.equal(x.signatureValidated,true);
  assert.deepEqual(x.scopes,['buyer:read','buyer:write']);
  assert.equal(x.sub,'neopass:test-operator');
});
test('rejects unsigned algorithm none and header tricks',async()=>{
  assert.equal(await base()(issue({}, {alg:'none'})),null);
  assert.equal(await base()(issue({}, {kid:'untrusted'})),null);
  assert.equal(await base()(issue({}, {crit:['b64']})),null);
  assert.equal(await base()(issue({}, {zip:'DEF'})),null);
});
test('rejects altered payload and malformed signature',async()=>{
  const t=issue(),parts=t.split('.');
  parts[1]=encode({...JSON.parse(Buffer.from(parts[1],'base64url')),sub:'neopass:attacker'});
  assert.equal(await base()(parts.join('.')),null);
  assert.equal(await base()(t.split('.').slice(0,2).join('.')+'.bad'),null);
});
test('rejects incorrect issuer and audience',async()=>{
  assert.equal(await base()(issue({iss:'attacker'})),null);
  assert.equal(await base()(issue({aud:'neo-flipper-production'})),null);
});
test('rejects expired, future and overlong tokens',async()=>{
  const n=Math.floor(NOW/1000);
  assert.equal(await base()(issue({iat:n-500,exp:n-100})),null);
  assert.equal(await base()(issue({iat:n+100,exp:n+200})),null);
  assert.equal(await base()(issue({iat:n-50,exp:n+900})),null);
  assert.equal(await base()(issue({nbf:n+60})),null);
});
test('requires valid subject, jti and approved scopes',async()=>{
  assert.equal(await base()(issue({sub:''})),null);
  assert.equal(await base()(issue({jti:null})),null);
  assert.equal(await base()(issue({scopes:['admin:*']})),null);
  assert.equal(await base()(issue({scopes:[]})),null);
});
test('denies revoked session and inactive membership',async()=>{
  assert.equal(await base({isRevoked:async()=>true})(issue()),null);
  assert.equal(await base({getCurrentAccess:async()=>({active:false,scopes:['buyer:read']})})(issue()),null);
});
test('effective permissions are intersected with current live access',async()=>{
  const r=await base({getCurrentAccess:async()=>({active:true,scopes:['buyer:read']})})(issue());
  assert.deepEqual(r.scopes,['buyer:read']);
  assert.equal(await base({getCurrentAccess:async()=>({active:true,scopes:[]})})(issue()),null);
});
test('fail closed on revocation and identity provider outages',async()=>{
  await assert.rejects(base({isRevoked:async()=>{throw Error('auth network unavailable')}})(issue()),/auth network unavailable/);
  await assert.rejects(base({getCurrentAccess:async()=>{throw Error('membership down')}})(issue()),/membership down/);
});
test('does not accept a self-asserted JSON token',async()=>{
  assert.equal(await base()(JSON.stringify({signatureValidated:true,sub:'owner',scopes:['buyer:write']})),null);
});
