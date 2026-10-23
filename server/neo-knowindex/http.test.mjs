import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createKnowindexContributionLedger } from './ledger.mjs';
import { createKnowindexContributionHttpHandler } from './http.mjs';
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs';
import { prepareTestKi018Activation } from './test-activation.mjs';

const secret = 'a-secret-of-at-least-thirty-two-bytes-for-local-test-only';
const current = Date.parse('2026-10-23T12:00:00.000Z');
const now = () => current;
const ledger = () => createKnowindexContributionLedger({ now: () => new Date(current) });
const users = new Map([
  ['google:alice', { subject: 'google:alice', role: 'member', neopassStatus: 'active' }],
  ['google:bob', { subject: 'google:bob', role: 'curator', neopassStatus: 'active' }],
  ['google:charlie', { subject: 'google:charlie', role: 'executive-admin', neopassStatus: 'active' }],
  ['google:pending', { subject: 'google:pending', role: 'member', neopassStatus: 'pending' }]
]);
const authService = { async session(subject) { return users.get(subject) || null; } };
const token = (subject, claims = {}) => issueNeopassToken({ subject, secret, issuer: 'neo-pass', now, claims });
const input = overrides => ({
  title: 'Community library reference',
  url: 'https://example.org/knowledge/reference',
  description: 'A public source offered for attribution and human moderation.',
  attribution: 'Community archive author',
  sourceClass: 'community',
  community: 'Source contributors',
  rightsBasis: 'link-only',
  rightsStatement: 'Index links and metadata only until rights verification is complete.',
  consentToIndex: true,
  ...overrides
});
const headers = (subject, extra = {}) => ({
  authorization: 'Bearer ' + token(subject),
  'content-type': 'application/json',
  ...extra
});
async function withServer(callback, config = {}) {
  const store = ledger();
  const pilotActivation = prepareTestKi018Activation(store);
  const handler = createKnowindexContributionHttpHandler({
    ledger: store, authService, jwtSecret: secret, jwtIssuer: 'neo-pass', now, enabled: true, pilotActivation, ...config
  });
  const server = createServer(async (req, res) => {
    const handled = await handler(req, res);
    if (!handled) { res.writeHead(404); res.end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await callback('http://127.0.0.1:' + server.address().port, store); }
  finally { server.close(); await once(server, 'close'); store.close(); }
}
const endpoint = '/api/v1/noogle/knowledge/contributions';
const send = (base, resource, subject, body, extraHeaders = {}) => fetch(base + resource, {
  method: 'POST', headers: headers(subject, extraHeaders), body: JSON.stringify(body)
});

test('default-disabled API fails closed and never exposes state', async () => {
  await withServer(async base => {
    const res = await fetch(base + endpoint);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).writesEnabled, false);
    assert.notEqual(res.headers.get('access-control-allow-origin'), '*');
  }, { enabled: false });
});

test('requires verified NEOpass bearer and active membership; forged subject headers are inert', async () => {
  await withServer(async base => {
    assert.equal((await fetch(base + endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input()) })).status, 401);
    const pending = await send(base, endpoint, 'google:pending', input());
    assert.equal(pending.status, 403);
    const forged = await fetch(base + endpoint, {
      method: 'POST',
      headers: { authorization: 'Bearer tampered.payload.signature', 'x-neopass-subject': 'google:charlie', 'content-type': 'application/json' },
      body: JSON.stringify(input())
    });
    assert.equal(forged.status, 401);
    const browser = await fetch(base + endpoint, {
      method: 'POST', headers: { authorization: 'Bearer ' + token('google:alice', { token_use: 'browser', scope: 'neo:oracle:execute' }), 'content-type': 'application/json' },
      body: JSON.stringify(input())
    });
    assert.equal(browser.status, 401);
  });
});

test('active submitter writes a private pending record that is never indexed automatically', async () => {
  await withServer(async (base, store) => {
    const create = await send(base, endpoint, 'google:alice', input(), { 'idempotency-key': 'test-request-00001' });
    assert.equal(create.status, 201);
    const body = await create.json();
    assert.equal(body.reviewRequired, true);
    assert.equal(body.published, false);
    assert.equal(body.contribution.state, 'submitted');
    const same = await send(base, endpoint, 'google:alice', input(), { 'idempotency-key': 'test-request-00001' });
    assert.equal(same.status, 200);
    assert.equal((await same.json()).contribution.id, body.contribution.id);
    const other = await fetch(base + endpoint + '/' + body.contribution.id, { headers: headers('google:pending') });
    assert.equal(other.status, 403);
    const owner = await fetch(base + endpoint + '/' + body.contribution.id, { headers: headers('google:alice') });
    assert.equal(owner.status, 200);
    assert.equal(store.verifyAuditChain().checked, 1);
  });
});

test('moderation requires true registry role, second actor, and versioned transition', async () => {
  await withServer(async (base, store) => {
    const created = await (await send(base, endpoint, 'google:alice', input())).json();
    const id = created.contribution.id;
    const deny = await send(base, endpoint + '/' + id + '/review', 'google:alice', {
      action: 'validate', note: 'Submitting user attempts self-review.', expectedVersion: 1
    });
    assert.equal(deny.status, 403);
    let version = 1;
    for (const action of ['validate', 'attribute', 'approve']) {
      const res = await send(base, endpoint + '/' + id + '/review', 'google:bob', {
        action, note: 'Evidence and attribution have been checked manually.', expectedVersion: version
      });
      assert.equal(res.status, 200);
      const item = (await res.json()).contribution;
      assert.equal(item.version, ++version);
      assert.equal(item.indexPublished, false);
    }
    const stale = await send(base, endpoint + '/' + id + '/review', 'google:bob', {
      action: 'remove', note: 'Stale control version is rejected.', expectedVersion: 1
    });
    assert.equal(stale.status, 409);
    const withdrawn = await send(base, endpoint + '/' + id + '/withdraw', 'google:alice', {
      note: 'Contributor withdraws and requests removal.', expectedVersion: 4
    });
    assert.equal((await withdrawn.json()).contribution.state, 'removed');
    const audit = await fetch(base + endpoint + '/' + id + '/audit', { headers: headers('google:alice') });
    assert.equal(audit.status, 200);
    assert.equal((await audit.json()).events.length, 5);
    assert.equal(store.verifyAuditChain().valid, true);
  });
});

test('API respects origin allowlist, JSON size boundary, and curator-only moderation queue', async () => {
  await withServer(async base => {
    const cross = await send(base, endpoint, 'google:alice', input(), { origin: 'https://attacker.example' });
    assert.equal(cross.status, 403);
    const approved = await send(base, endpoint, 'google:alice', input(), { origin: 'https://holytemples.org' });
    assert.equal(approved.status, 201);
    assert.equal(approved.headers.get('access-control-allow-origin'), 'https://holytemples.org');
    assert.notEqual(approved.headers.get('access-control-allow-origin'), '*');
    assert.equal((await fetch(base + '/api/v1/noogle/knowledge/moderation', { headers: headers('google:alice') })).status, 403);
    const listing = await fetch(base + '/api/v1/noogle/knowledge/moderation', { headers: headers('google:bob') });
    assert.equal(listing.status, 200);
    assert.equal((await listing.json()).records.length, 1);
    const tooLarge = await send(base, endpoint, 'google:alice', input({ description: 'x'.repeat(15_000) }));
    assert.equal(tooLarge.status, 413);
    const privateUrl = await send(base, endpoint, 'google:alice', input({ url: 'https://127.0.0.1/private' }));
    assert.equal(privateUrl.status, 400);
  });
});


test('KI-018 Boolean write flag is insufficient without independently signed activation', async () => {
  await withServer(async base => {
    const result = await send(base, endpoint, 'google:alice', input());
    assert.equal(result.status, 503);
    const body = await result.json();
    assert.equal(body.error, 'knowindex_activation_not_certified');
    assert.equal(body.writesEnabled, false);
  }, { enabled: true, pilotActivation: null });
});
