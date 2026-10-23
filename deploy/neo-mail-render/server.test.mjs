import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPostmasterServer } from './server.mjs';

async function withServer(callback) {
  const server = createPostmasterServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { return await callback('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('health is truthful and outbound disabled', () => withServer(async base => {
  const r = await fetch(base + '/healthz');
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.mailboxConnected, false);
  assert.equal(body.outboundEnabled, false);
  assert.equal(r.headers.get('cache-control'), 'no-store, private');
}));

test('administrative and consumer routes fail closed', () => withServer(async base => {
  for (const route of ['/admin', '/admin/users', '/api/messages', '/nmail/inbox']) {
    const r = await fetch(base + route);
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error, 'access_not_configured');
  }
}));

test('no fake connected status on homepage', () => withServer(async base => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.messageSource, 'not_connected');
  assert.equal(body.mailDelivery, 'disabled');
}));
