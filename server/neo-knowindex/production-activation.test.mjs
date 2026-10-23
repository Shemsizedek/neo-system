import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { verifyKnowindexPilotActivation, sha256Hex } from './production-activation.mjs';
import { prepareTestKi018Activation } from './test-activation.mjs';

const FIXED = () => new Date('2026-10-23T12:00:00.000Z');
const ledger = () => ({ inspectRuntimeSecurity: async () => ({
  leastPrivilegeVerified: true, productionDatabaseEligible: true,
  auditChainVerified: true, pilotOneRecordLimitConfigured: true,
  databaseFingerprint: 'b'.repeat(64)
}) });
const fixture = () => prepareTestKi018Activation(null);
const evaluate = (f, extra = {}) => verifyKnowindexPilotActivation({
  envelope: f.envelope, trustKeys: f.trustKeys,
  deploymentSha: f.deploymentSha, ledger: ledger(), now: FIXED, ...extra
});

test('KI-018 valid two-party signed pilot is accepted only with live database posture', async () => {
  const f = fixture();
  const result = await evaluate(f);
  assert.equal(result.authorized, true);
  assert.equal(result.reason, 'signed_single_record_pilot');
  assert.equal(result.certificateSha256.length, 64);
  assert.equal(result.contributorSubjectSha256, sha256Hex('google:alice'));
  assert.equal(result.curatorSubjectSha256, sha256Hex('google:bob'));
});

test('KI-018 never interprets Boolean enable or unsigned evidence as approval', async () => {
  const f = fixture();
  assert.equal((await evaluate(f, { envelope: null })).authorized, false);
  assert.equal((await evaluate(f, { envelope: { payload: f.envelope.payload, signatures: [] } })).authorized, false);
  assert.equal((await evaluate(f, { trustKeys: null })).authorized, false);
  assert.equal((await evaluate(f, { ledger: null })).authorized, false);
});

test('KI-018 rejects a changed signed statement, swapped roles and duplicated signatures', async () => {
  const f = fixture();
  const modified = { ...f.statement, maxTotalSubmissions: 15 };
  assert.equal((await evaluate(f, {
    envelope: { ...f.envelope, payload: Buffer.from(JSON.stringify(modified)).toString('base64url') }
  })).authorized, false);
  assert.equal((await evaluate(f, {
    envelope: { ...f.envelope, signatures: [f.envelope.signatures[0], f.envelope.signatures[0]] }
  })).authorized, false);
  assert.equal((await evaluate(f, {
    envelope: { ...f.envelope, signatures: [
      { ...f.envelope.signatures[0], role: 'security' },
      { ...f.envelope.signatures[1], role: 'operator' }
    ] }
  })).authorized, false);
});

test('KI-018 rejects identical signing identities and untrusted keys', async () => {
  const f = fixture();
  assert.equal((await evaluate(f, {
    trustKeys: { operator: f.trustKeys.operator, security: f.trustKeys.operator }
  })).reason, 'signers_not_independent');
  assert.equal((await evaluate(f, {
    trustKeys: { operator: f.trustKeys.operator, security: generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) }
  })).authorized, false);
});

test('KI-018 rejects expired, future, and overlong authorization windows', async () => {
  const f = fixture();
  for (const changes of [
    { expiresAt: '2026-10-23T11:59:59.000Z' },
    { issuedAt: '2026-10-23T12:02:00.000Z' },
    { expiresAt: '2026-10-25T15:00:00.000Z' }
  ]) {
    assert.equal((await evaluate(f, { envelope: f.signEnvelope({ ...f.statement, ...changes }) })).reason,
      'authorization_expired_or_invalid');
  }
});

test('KI-018 requires a matching deployed commit and a matching production DB fingerprint', async () => {
  const f = fixture();
  assert.equal((await evaluate(f, { deploymentSha: 'c'.repeat(40) })).reason, 'authorization_scope_invalid');
  assert.equal((await evaluate(f, { ledger: { inspectRuntimeSecurity: async () => ({
    ...(await ledger().inspectRuntimeSecurity()), databaseFingerprint: 'c'.repeat(64)
  }) } })).reason, 'database_or_audit_not_certified');
  assert.equal((await evaluate(f, { envelope: f.signEnvelope({ ...f.statement, databaseFingerprint: 'c'.repeat(64) }) })).reason,
    'database_or_audit_not_certified');
});

test('KI-018 requires each independently archived evidence receipt', async () => {
  const f = fixture();
  const incomplete = { ...f.statement, evidence: { ...f.statement.evidence, offHostBackupRestore: null } };
  assert.equal((await evaluate(f, { envelope: f.signEnvelope(incomplete) })).reason, 'required_evidence_missing');
  const duplicated = { ...f.statement, evidence: {
    ...f.statement.evidence,
    offHostBackupRestore: f.statement.evidence.dedicatedDatabaseOwnership
  } };
  assert.equal((await evaluate(f, { envelope: f.signEnvelope(duplicated) })).reason, 'evidence_not_independent');
});

test('KI-018 is restricted to a single named contributor and independent curator', async () => {
  const f = fixture();
  const selfApproval = { ...f.statement, curatorSubjectSha256: f.statement.contributorSubjectSha256 };
  assert.equal((await evaluate(f, { envelope: f.signEnvelope(selfApproval) })).reason, 'authorization_scope_invalid');
  const noHardLimit = { ...f.statement, maxTotalSubmissions: 2 };
  assert.equal((await evaluate(f, { envelope: f.signEnvelope(noHardLimit) })).reason, 'authorization_scope_invalid');
  const otherService = { ...f.statement, service: 'neo-pads-production' };
  assert.equal((await evaluate(f, { envelope: f.signEnvelope(otherService) })).reason, 'authorization_scope_invalid');
});

test('KI-018 fails closed for elevated DB role, missing audit, or missing one-record cap', async () => {
  const f = fixture();
  for (const changed of [
    { leastPrivilegeVerified: false },
    { productionDatabaseEligible: false },
    { auditChainVerified: false },
    { pilotOneRecordLimitConfigured: false }
  ]) {
    const posture = { ...(await ledger().inspectRuntimeSecurity()), ...changed };
    assert.equal((await evaluate(f, { ledger: { inspectRuntimeSecurity: async () => posture } })).reason,
      'database_or_audit_not_certified');
  }
});

test('KI-018 runtime DB outage remains fail-closed without revealing error data', async () => {
  const f = fixture();
  const response = await evaluate(f, { ledger: {
    async inspectRuntimeSecurity() { throw new Error('do-not-leak-database-password'); }
  } });
  assert.equal(response.authorized, false);
  assert.equal(JSON.stringify(response).includes('do-not-leak'), false);
});
