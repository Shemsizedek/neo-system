import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOUNDER_SUBJECT_ID,
  assertFounderInvariant,
  bootstrapFounderAccount,
  canDeletePrincipal,
  founderPrincipal,
  requiresStepUp,
} from './founder.mjs';

test('founder principal is account one and cannot bypass authentication', () => {
  assert.equal(founderPrincipal.subject_id, FOUNDER_SUBJECT_ID);
  assert.equal(founderPrincipal.ordinal, 1);
  assert.equal(founderPrincipal.authentication_bypass, false);
  assert.equal(canDeletePrincipal(founderPrincipal), false);
  assert.equal(assertFounderInvariant(founderPrincipal), true);
});

test('bootstrap is idempotent', async () => {
  let stored = null;
  const adapter = {
    async findBySubject() { return stored; },
    async insert(record) { stored = record; return record; },
  };

  const first = await bootstrapFounderAccount(adapter, { display_name: 'Founder' });
  const second = await bootstrapFounderAccount(adapter, { display_name: 'Ignored' });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.principal.subject_id, FOUNDER_SUBJECT_ID);
  assert.equal(second.principal.profile.display_name, 'Founder');
});

test('invalid founder records are rejected', () => {
  assert.throws(() => assertFounderInvariant({ ...founderPrincipal, ordinal: 2 }), /ordinal/);
  assert.throws(() => assertFounderInvariant({ ...founderPrincipal, authentication_bypass: true }), /authentication_bypass/);
});

test('high-impact actions require step-up verification', () => {
  assert.equal(requiresStepUp('change_owner'), true);
  assert.equal(requiresStepUp('disable_mfa'), true);
  assert.equal(requiresStepUp('view_dashboard'), false);
});
