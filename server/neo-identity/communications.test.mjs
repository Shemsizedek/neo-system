import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeFounderEnrollment, founderEnrollmentState, FOUNDER_SUBJECT } from '../../apps/neo-telegram/founder-identity.mjs';

test('founder communications identity is reserved and requires verified enrollment', () => {
  const state=founderEnrollmentState('pubkey-1');
  assert.equal(state.subjectId, FOUNDER_SUBJECT);
  assert.equal(state.accountOrdinal, 1);
  assert.equal(state.reserved, true);
  assert.equal(state.verifiedEnrollmentRequired, true);
  assert.equal(state.authenticationBypass, false);
  assert.equal(state.messageSigningBypass, false);
});

test('founder cannot be claimed when relay enrollment key is unconfigured', () => {
  const result=authorizeFounderEnrollment({identity:FOUNDER_SUBJECT,presentedPublicKey:'attacker',configuredPublicKey:''});
  assert.deepEqual(result,{ok:false,status:503,error:'founder_enrollment_not_configured'});
});

test('founder enrollment rejects the wrong public key', () => {
  const result=authorizeFounderEnrollment({identity:FOUNDER_SUBJECT,presentedPublicKey:'wrong',configuredPublicKey:'right'});
  assert.deepEqual(result,{ok:false,status:403,error:'founder_key_mismatch'});
});

test('founder enrollment succeeds only with the configured public key', () => {
  const result=authorizeFounderEnrollment({identity:FOUNDER_SUBJECT,presentedPublicKey:'right',configuredPublicKey:'right'});
  assert.equal(result.ok,true);
  assert.equal(result.founder,true);
  assert.equal(result.accountOrdinal,1);
  assert.equal(result.role,'founder_owner');
});

test('ordinary identities remain subject to normal relay signature authentication', () => {
  const result=authorizeFounderEnrollment({identity:'neo:user:000002',presentedPublicKey:'key',configuredPublicKey:'founder-key'});
  assert.deepEqual(result,{ok:true,founder:false});
});
