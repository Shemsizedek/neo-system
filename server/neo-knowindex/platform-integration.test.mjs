import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createNeoPlatformApi } from '../neo-platform-api/server.mjs';
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs';
import { createKnowindexContributionLedger } from './ledger.mjs';

const nowEpoch = Date.parse('2026-10-23T12:00:00Z');
const secret = 'ki014-integration-test-secret-do-not-deploy-outside-tests';
const authService = {
  async session(subject) {
    if (subject === 'google:ki014-test-member') return { subject, role: 'member', neopassStatus: 'active' };
    return { subject, role: 'member', neopassStatus: 'pending' };
  }
};
const bearer = issueNeopassToken({ subject: 'google:ki014-test-member', secret, issuer: 'neo-pass', now: () => nowEpoch });
const submission = {
  title: 'Protected KI-014 source',
  url: 'https://example.org/ki014/library',
  description: 'A small public reference for internal review and controlled indexing.',
  attribution: 'Publisher and community',
  community: 'Knowledge contributors',
  sourceClass: 'reference',
  rightsBasis: 'link-only',
  rightsStatement: 'Only the title and public canonical link may be reviewed.',
  consentToIndex: true
};

async function runServer(options, fn) {
  const app = createNeoPlatformApi(options);
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  try { return await fn('http://127.0.0.1:' + app.address().port); }
  finally { app.close(); await once(app, 'close'); }
}

test('normal NEO Platform API disables knowledge writes without explicit opt-in', async () => {
  await runServer({}, async base => {
    const res = await fetch(base + '/api/v1/noogle/knowledge/contributions');
    assert.equal(res.status, 503);
    assert.equal((await res.json()).writesEnabled, false);
    const origin = await fetch(base + '/api/v1/noogle/knowledge/contributions', {
      method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' }
    });
    assert.equal(origin.status, 403);
    assert.notEqual(origin.headers.get('access-control-allow-origin'), '*');
  });
});

test('explicitly opted-in platform route enforces session and keeps writes unpublished', async () => {
  const ledger = createKnowindexContributionLedger({ now: () => new Date(nowEpoch) });
  try {
    await runServer({
      authService,
      knowindexContributionLedger: ledger,
      knowindexWriteEnabled: true,
      knowindexJwtSecret: secret,
      now: () => '2026-10-23T12:00:00Z'
    }, async base => {
      const res = await fetch(base + '/api/v1/noogle/knowledge/contributions', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + bearer, 'content-type': 'application/json', origin: 'https://shemsizedek.github.io' },
        body: JSON.stringify(submission)
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.contribution.state, 'submitted');
      assert.equal(body.contribution.indexPublished, false);
      assert.equal(ledger.verifyAuditChain().checked, 1);
      assert.equal((await fetch(base + '/api/v1/noogle/knowledge/contributions', {
        method: 'POST', headers: { authorization: 'Bearer ' + bearer, 'content-type': 'application/json', origin: 'https://evil.example' }, body: JSON.stringify(submission)
      })).status, 403);
      assert.equal((await fetch(base + '/api/v1/noogle/knowledge/moderation', {
        headers: { authorization: 'Bearer ' + bearer, 'x-neopass-subject': 'google:curator' }
      })).status, 403);
    });
  } finally { ledger.close(); }
});
