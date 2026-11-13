import test from 'node:test';
import assert from 'node:assert/strict';
import { issueNeopassToken } from './neopass-google-auth.mjs';
import { authorizeNeoPlatformRequest, enforceNeoPlatformSession, allowedNeoPlatformOrigin } from './neo-platform-session-gate.mjs';

const secret = 's'.repeat(48);
const now = () => 1_790_000_000_000;
const token = (claims = {}) => issueNeopassToken({
  subject: 'member-1', secret, now, ttlSeconds: 300,
  claims: { aud: 'neo-hub', token_use: 'session', scope: 'platform:session', ...claims },
});
const request = (extra = {}) => ({
  token: token(), secret, now, platform: 'neo-hub', sessionLookup: async () => ({ role: 'member', status: 'active' }), ...extra,
});

test('rejects unknown platforms and missing configuration', () => {
  assert.equal(authorizeNeoPlatformRequest(request({ platform: 'unknown' })).reason, 'unknown_platform');
  assert.equal(authorizeNeoPlatformRequest(request({ secret: '' })).reason, 'auth_not_configured');
});
test('requires matching platform audience and session token purpose', () => {
  assert.equal(authorizeNeoPlatformRequest(request({ platform: 'counterpay' })).reason, 'wrong_audience');
  assert.equal(authorizeNeoPlatformRequest(request({ token: token({ token_use: 'crown-office-attestation' }) })).reason, 'invalid_session');
  assert.equal(authorizeNeoPlatformRequest(request({ token: token({ scope: 'wallet:sign' }) })).reason, 'invalid_session');
});
test('requires an active server-verified account, not token asserted role', async () => {
  assert.equal((await enforceNeoPlatformSession(request())).ok, true);
  assert.equal((await enforceNeoPlatformSession(request({ sessionLookup: async () => ({ role: 'member', status: 'pending' }) }))).reason, 'access_denied');
  assert.equal((await enforceNeoPlatformSession(request({ sessionLookup: async () => ({ role: 'admin', status: 'active' }) }))).reason, 'access_denied');
  assert.equal((await enforceNeoPlatformSession(request({ sessionLookup: async () => { throw Error('down'); } }))).reason, 'session_registry_unavailable');
});
test('fails closed when registry absent and maintains exact trusted origins', () => {
  assert.equal(authorizeNeoPlatformRequest(request({ sessionLookup: undefined })).reason, 'session_registry_unavailable');
  assert.equal(allowedNeoPlatformOrigin('counterpay'), 'https://counterpay.holytemples.org');
  assert.equal(allowedNeoPlatformOrigin('evil'), null);
});
