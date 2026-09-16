import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeoGuardServer, SERVICE } from './index.mjs';

async function start() {
  const s = createNeoGuardServer({enrollmentToken:'this-is-a-long-test-enrollment-token'});
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  return {s, base:`http://127.0.0.1:${s.address().port}`};
}
async function post(base, path, token, payload) {
  return fetch(base+path,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
}
function authPayload(payload, nonce='test_nonce_0000001') { return {...payload, nonce, sentAt:new Date().toISOString()}; }

test('canonical host is neoguard.holytemples.org', () => assert.equal(SERVICE.canonicalHost,'neoguard.holytemples.org'));

test('enrollment requires bootstrap token and returns device credential without ADB secrets', async () => {
  const {s,base}=await start(); try {
    const payload={endpointId:'neo:endpoint:000001',hostPublicKeyFingerprint:'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99'};
    assert.equal((await post(base,'/v1/enroll','wrong-token-that-is-long-enough',payload)).status,401);
    const r=await post(base,'/v1/enroll','this-is-a-long-test-enrollment-token',payload); assert.equal(r.status,201);
    const j=await r.json(); assert.ok(j.deviceToken); assert.equal(j.pairingCodeStored,false); assert.equal(j.adbPrivateKeyStored,false);
  } finally {s.close();}
});

test('secret material is refused', async () => {
  const {s,base}=await start(); try {
    const r=await post(base,'/v1/enroll','this-is-a-long-test-enrollment-token',{endpointId:'neo:endpoint:000001',hostPublicKeyFingerprint:'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',pairing_code:'123456'});
    assert.equal(r.status,400); assert.equal((await r.json()).error,'secret_material_refused');
  } finally {s.close();}
});

test('event ingestion requires device auth and inert NEO Hacker schema', async () => {
  const {s,base}=await start(); try {
    const p={endpointId:'neo:endpoint:000001',hostPublicKeyFingerprint:'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99'};
    const e=await post(base,'/v1/enroll','this-is-a-long-test-enrollment-token',p); const token=(await e.json()).deviceToken;
    assert.equal((await post(base,'/v1/events','bad-token-that-is-long-enough',authPayload({endpointId:p.endpointId,event:{schema:'neo.hacker.endpoint-event.v1'}},'test_nonce_0000002'))).status,401);
    const r=await post(base,'/v1/events',token,authPayload({endpointId:p.endpointId,event:{schema:'neo.hacker.endpoint-event.v1'}},'test_nonce_0000003')); const j=await r.json();
    assert.equal(r.status,202); assert.equal(j.toolAuthority,'NONE'); assert.equal(j.consequentialAction,false);
  } finally {s.close();}
});
