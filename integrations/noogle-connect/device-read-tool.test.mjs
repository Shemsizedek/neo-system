import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceReadTool } from './device-read-tool.mjs';
test('selects account from verified claims and omits credentials from results', async () => {
  const calls = [];
  const list = createDeviceReadTool({
    verifyAccessToken: async token => ({ subject: token === 'alice-token' ? 'alice' : 'bob', scopes: ['devices:read'] }),
    store: { list: async subject => { calls.push(subject); return [{ id: subject + '-device', type: 'android', label: 'Phone', subject, publicKey: 'private-store-field', publicKeyHash: 'hash' }]; } }
  });
  for (const [token, subject] of [['alice-token','alice'],['bob-token','bob']]) {
    const result = await list({}, { authorization: 'Bearer ' + token, subject: 'forged' });
    assert.deepEqual(result.devices, [{ id: subject + '-device', type: 'android', label: 'Phone', createdAt: undefined, revokedAt: undefined }]);
    assert.equal(result.liveHealthChecked, false); assert.equal(result.deviceControlEnabled, false);
  }
  assert.deepEqual(calls, ['alice','bob']);
});
test('rejects caller identity arguments before accessing identity or store', async () => {
  let called = false;
  const list = createDeviceReadTool({ verifyAccessToken: async () => { called = true; }, store: { list: async () => { called = true; } } });
  await assert.rejects(list({ subject: 'victim' }, { authorization: 'Bearer token' }), /invalid_arguments/);
  assert.equal(called, false);
});
test('missing credentials, rejected tokens, invalid subjects and missing scope deny store access', async () => {
  let storeCalls = 0;
  for (const identity of [null, {subject:''}, {subject:'owner',scopes:[]}, new Error('expired_token')]) {
    const list = createDeviceReadTool({ verifyAccessToken: async () => { if (identity instanceof Error) throw identity; return identity; }, store: { list: async () => { storeCalls++; } } });
    await assert.rejects(list({}, {}), /authentication_required/);
    await assert.rejects(list({}, {authorization:'Bearer token'}), /authentication_required|insufficient_scope/);
  }
  assert.equal(storeCalls, 0);
});
test('store failures never become an empty successful device list', async () => {
  for (const failure of [undefined, new Error('database_unavailable')]) {
    const list = createDeviceReadTool({verifyAccessToken:async()=>({subject:'owner',scopes:['devices:read']}),store:{list:async()=>{if(failure instanceof Error)throw failure;return failure;}}});
    await assert.rejects(list({}, {authorization:'Bearer token'}), /device_store_unavailable|database_unavailable/);
  }
});
test('dependencies are mandatory and device tool stays out of the public prototype', async () => {
  assert.throws(()=>createDeviceReadTool({}), /verified_identity_and_store_required/);
  const {tools}=await import('./tools.mjs');
  assert.equal(tools.some(tool=>tool.name==='noogle_list_devices'),false);
});
