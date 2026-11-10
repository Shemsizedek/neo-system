import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestGate } from './rate-limit.mjs';
import { createNousRuntime } from './runtime.mjs';
import { createIdentityVerifier } from './identity.mjs';
import { createNousServer } from './server.mjs';

test('per-process limiter bounds clients and frees expired buckets without trusting forwarded headers', () => {
  let now = 0;
  const gate = createRequestGate({ limit: 2, windowMs: 1000, maxClients: 2, now: () => now });
  assert.equal(gate.allow('1'), true);
  assert.equal(gate.allow('1'), true);
  assert.equal(gate.allow('1'), false);
  assert.equal(gate.allow('2'), true);
  assert.equal(gate.allow('3'), false);
  now = 1001;
  assert.equal(gate.allow('3'), true);
  assert.equal(gate.allow('1'), true);
  assert.throws(() => createRequestGate({ limit: -1 }), /invalid_rate_limit_configuration/);
});

test('HTTP bounded access returns 429 and security headers with no identity downgrade', async () => {
  const runtime = createNousRuntime({ identityVerifier: createIdentityVerifier({}) });
  const server = createNousServer({ runtime, requestGate: createRequestGate({ limit: 2, windowMs: 60000 }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = 'http://127.0.0.1:' + server.address().port;
    const h = { 'x-forwarded-for': 'forged-user', authorization: 'Bearer fake' };
    const a = await fetch(url + '/v1/agents', { headers: h });
    assert.equal(a.status, 503);
    assert.equal(a.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(a.headers.get('x-frame-options'), 'DENY');
    assert.equal((await fetch(url + '/v1/agents', { headers: { 'x-forwarded-for': 'other' } })).status, 503);
    const block = await fetch(url + '/v1/agents', { headers: { 'x-forwarded-for': 'new-spoofed-value' } });
    assert.equal(block.status, 429);
    assert.equal((await block.json()).error, 'rate_limit_exceeded');
    assert.equal((await fetch(url + '/health')).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
