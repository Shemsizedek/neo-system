import test from 'node:test';
import assert from 'node:assert/strict';
import { createNousMembershipGuard } from './nous-membership-guard.mjs';

const now = 1780000000000;
const epoch = Math.floor(now / 1000);
const claims = { sub: 'google:test', iat: epoch - 30 };
const approved = { subject: 'google:test', status: 'active', nousAccessEnabled: true };

test('authoritative registry only allows consented active member', async () => {
  const guard = createNousMembershipGuard({ getCredential: async () => approved, now: () => now });
  assert.equal(await guard(claims), true);
  assert.equal(await guard({ ...claims, sub: 'other' }), false);
  assert.equal(await guard({ sub: claims.sub }), false);
});

test('revocation cutoff, opt-out, expiry, suspension and missing registry all deny', async () => {
  const variants = [
    null, { ...approved, nousAccessEnabled: false }, { ...approved, status: 'pending' },
    { ...approved, status: 'disabled' }, { ...approved, disabled: true },
    { ...approved, suspended: true }, { ...approved, sessionRevokedAfter: epoch - 30 },
    { ...approved, sessionRevokedAfter: 'not-a-number' },
    { ...approved, nousAccessExpiresAt: new Date(now - 1000).toISOString() },
    { ...approved, nousAccessExpiresAt: 'invalid' },
  ];
  for (const record of variants) {
    const guard = createNousMembershipGuard({ getCredential: async () => record, now: () => now });
    assert.equal(await guard(claims), false);
  }
  assert.throws(() => createNousMembershipGuard({}), /nous_credential_lookup_required/);
});
