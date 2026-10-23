import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createKnowindexNeopassAuthority } from './neopass-authority.mjs';
import { createKnowindexContributionHttpHandler } from './http.mjs';
import { createKnowindexContributionLedger } from './ledger.mjs';
import { prepareTestKi018Activation } from './test-activation.mjs';
import { issueNeopassToken, createGoogleNeopassAuth } from '../neo-platform-api/neopass-google-auth.mjs';

const alice = 'google:alice-verified-0001';
const bob = 'google:bob-verified-0002';
const ceo = 'google:executive-verified-0003';
const fixed = Date.parse('2026-10-23T14:00:00Z');
const secret = 'ki016-test-signing-secret-never-use-in-production';
const submission = {
  title: 'An authorized public reference',
  url: 'https://example.org/knowledge/verified',
  description: 'A community-submitted item requiring human attribution review.',
  attribution: 'Verified publisher',
  sourceClass: 'archive',
  rightsBasis: 'link-only',
  rightsStatement: 'Only public title and link metadata may be used.',
  consentToIndex: true
};
const active = (subject, role = 'member', overrides = {}) => ({
  subject, provider: 'google', providerSubject: subject.slice('google:'.length),
  email: 'member@example.org', status: 'active', role, ...overrides
});
const records = new Map([
  [alice, active(alice)],
  [bob, active(bob, 'curator')],
  [ceo, active(ceo, 'executive-admin', { email: 'executive@example.org' })]
]);
const registry = {
  async getNEOpassCredential(subject) { return records.get(subject) || null; }
};
const authority = () => createKnowindexNeopassAuthority({
  registry, approvedCurators: [bob], approvedExecutives: [ceo], executiveEmail: 'executive@example.org'
});
const signed = (subject, claims = {}) => issueNeopassToken({
  subject, secret, issuer: 'neo-pass', now: () => fixed, claims
});
async function withApi(fn) {
  const ledger = createKnowindexContributionLedger({ now: () => new Date(fixed) });
  const app = createKnowindexContributionHttpHandler({
    ledger, authService: authority(), enabled: true, jwtSecret: secret,
    jwtIssuer: 'neo-pass', now: () => fixed,
    pilotActivation: prepareTestKi018Activation(ledger, { contributor: alice, curator: bob })
  });
  const server = createServer(async (req, res) => {
    if (!await app(req, res)) { res.statusCode = 404; res.end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await fn('http://127.0.0.1:' + server.address().port, ledger); }
  finally {
    server.close();
    await once(server, 'close');
    ledger.close();
  }
}
const endpoint = '/api/v1/noogle/knowledge/contributions';
const request = (base, path, subject, payload, claims) => fetch(base + path, {
  method: 'POST', headers: {
    authorization: 'Bearer ' + signed(subject, claims),
    'content-type': 'application/json',
    origin: 'https://shemsizedek.github.io'
  }, body: JSON.stringify(payload)
});

test('NEOpass claims cannot elevate the role or bypass an empty registry', async () => {
  const trusted = authority();
  const claims = { role: 'executive-admin', email: 'executive@example.org' };
  assert.equal((await trusted.session(alice, claims)).role, 'member');
  assert.equal(await trusted.session('google:missing', claims), null);
  assert.equal(trusted.inspectConfiguration().executiveBootstrapAllowed, false);
  assert.equal(trusted.inspectConfiguration().tokenClaimRolesTrusted, false);
});

test('only approved curator subject plus active registry role can moderate', async () => {
  const auth = authority();
  assert.equal((await auth.session(bob, { role: 'member' })).role, 'curator');
  const unapproved = createKnowindexNeopassAuthority({ registry });
  assert.equal((await unapproved.session(bob)).role, 'member');
  const prior = records.get(bob);
  try {
    records.set(bob, { ...prior, status: 'revoked' });
    assert.equal(await auth.session(bob), null);
    records.set(bob, { ...prior, role: 'member' });
    assert.equal((await auth.session(bob)).role, 'member');
    records.set(bob, { ...prior, providerSubject: 'mismatched-subject' });
    assert.equal(await auth.session(bob), null);
  } finally { records.set(bob, prior); }
});

test('executive authority requires pinned subject, verified Google record, and matching email', async () => {
  const trusted = authority();
  assert.equal((await trusted.session(ceo)).role, 'executive-admin');
  const prior = records.get(ceo);
  try {
    records.set(ceo, { ...prior, email: 'changed@example.org' });
    assert.equal((await trusted.session(ceo)).role, 'member');
    records.set(ceo, { ...prior, status: 'pending' });
    assert.equal(await trusted.session(ceo), null);
    records.set(ceo, { ...prior, provider: 'local' });
    assert.equal((await trusted.session(ceo)).role, 'member');
  } finally { records.set(ceo, prior); }
});

test('registry exceptions fail closed and never fall back to token claims', async () => {
  const missing = createKnowindexNeopassAuthority({ registry: {
    async getNEOpassCredential() { throw new Error('firestore_unavailable'); }
  } });
  await assert.rejects(missing.session(alice, { role: 'executive-admin' }), /firestore_unavailable/);
  assert.throws(() => createKnowindexNeopassAuthority({ registry: {}, approvedCurators: [bob] }), /registry_required/);
  assert.throws(() => createKnowindexNeopassAuthority({ registry, approvedExecutives: [ceo] }), /executive_identity_not_pinned/);
});

test('JWT claim admin cannot approve; registry-approved second person can', async () => {
  await withApi(async (base, ledger) => {
    const first = await request(base, endpoint, alice, submission, { role: 'executive-admin', email: 'executive@example.org' });
    assert.equal(first.status, 201);
    const id = (await first.json()).contribution.id;
    const claimed = await request(base, endpoint + '/' + id + '/review', alice,
      { action: 'validate', note: 'Forged self-review must be denied.', expectedVersion: 1 },
      { role: 'executive-admin', email: 'executive@example.org' });
    assert.equal(claimed.status, 403);
    const approvedCurator = await request(base, endpoint + '/' + id + '/review', bob,
      { action: 'validate', note: 'Independently reviewed metadata.', expectedVersion: 1 },
      { role: 'member' });
    assert.equal(approvedCurator.status, 200);
    assert.equal((await approvedCurator.json()).contribution.state, 'validated');
    assert.equal(ledger.verifyAuditChain().checked, 2);
  });
});

test('revocation and Firestore outage are checked on every HTTP operation', async () => {
  const prior = records.get(bob);
  await withApi(async base => {
    const first = await request(base, endpoint, alice, submission);
    const id = (await first.json()).contribution.id;
    try {
      records.set(bob, { ...prior, status: 'revoked' });
      const revoked = await request(base, endpoint + '/' + id + '/review', bob,
        { action: 'validate', note: 'Cannot review after revocation.', expectedVersion: 1 });
      assert.equal(revoked.status, 403);
      records.set(bob, { ...prior, role: 'member' });
      const demoted = await request(base, endpoint + '/' + id + '/review', bob,
        { action: 'validate', note: 'Role demoted and cannot review.', expectedVersion: 1 });
      assert.equal(demoted.status, 403);
    } finally { records.set(bob, prior); }
  });
});


test('KI-016 ignores signed executive bootstrap claims even with the generic NEOpass auth service', async () => {
  const genericAuth = createGoogleNeopassAuth({
    clientId: 'test-client',
    jwtSecret: secret,
    jwtIssuer: 'neo-pass',
    registry: {
      async getNEOpassCredential() { return null; },
      async upsert() { throw new Error('must_not_be_called'); }
    },
    verifyGoogleCredential: async () => { throw new Error('must_not_be_called'); },
    executiveAdminEmail: 'executive@example.org',
    now: () => fixed
  });
  const dangerousClaims = { role: 'executive-admin', email: 'executive@example.org' };
  // The broader portal supports bootstrap; KNOWINDEX must never grant bootstrap power.
  assert.equal((await genericAuth.session(alice, dangerousClaims)).role, 'executive-admin');

  const ledger = createKnowindexContributionLedger({ now: () => new Date(fixed) });
  const handler = createKnowindexContributionHttpHandler({
    ledger, authService: genericAuth, enabled: true, jwtSecret: secret, jwtIssuer: 'neo-pass', now: () => fixed,
    pilotActivation: prepareTestKi018Activation(ledger, { contributor: alice, curator: bob })
  });
  const server = createServer(async (req, res) => {
    if (!await handler(req, res)) { res.statusCode = 404; res.end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const response = await request(base, endpoint, alice, submission, dangerousClaims);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'active_verified_neopass_required');
    assert.equal(ledger.verifyAuditChain().checked, 0);
  } finally {
    server.close();
    await once(server, 'close');
    ledger.close();
  }
});
