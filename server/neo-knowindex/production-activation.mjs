import { createHash, createPublicKey, verify as verifyEd25519 } from 'node:crypto';

// KI-018: A signed, short-lived decision plus independently checked runtime
// security posture is mandatory even when a backend flag requests writes.
// This does NOT create real approval, restore a database, or provision IAM.
const SHA = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;
const SERVICE = 'neo-platform-api-recovery';
const EVIDENCE = [
  'cloudRunIssuerAndIam',
  'liveContributorIdentity',
  'independentCuratorRole',
  'dedicatedDatabaseOwnership',
  'offHostBackupRestore',
  'emergencyDisableDrill'
];
export const sha256Hex = value => createHash('sha256').update(String(value)).digest('hex');
const deny = reason => Object.freeze({ authorized: false, reason });
const dateMillis = value => {
  const date = value instanceof Date ? value : new Date(value);
  const millis = date.getTime();
  return Number.isFinite(millis) ? millis : NaN;
};
const isSha = value => typeof value === 'string' && SHA.test(value) && value !== '0'.repeat(64);

export async function verifyKnowindexPilotActivation({
  envelope,
  trustKeys,
  deploymentSha,
  ledger,
  now = () => new Date()
} = {}) {
  try {
    if (!envelope || typeof envelope !== 'object' ||
        typeof envelope.payload !== 'string' || envelope.payload.length > 6000 ||
        !B64URL.test(envelope.payload)) return deny('authorization_missing');

    const raw = Buffer.from(envelope.payload, 'base64url');
    if (!raw.length || raw.toString('base64url') !== envelope.payload) return deny('noncanonical_payload');
    const statement = JSON.parse(raw.toString('utf8'));
    if (statement?.schemaVersion !== 1 || statement.gate !== 'KI-018' ||
        statement.purpose !== 'knowindex-single-contribution-pilot' ||
        statement.environment !== 'production' || statement.service !== SERVICE ||
        statement.maxTotalSubmissions !== 1 ||
        !COMMIT.test(statement.deploymentSha || '') ||
        statement.deploymentSha !== deploymentSha ||
        !isSha(statement.databaseFingerprint) ||
        !isSha(statement.contributorSubjectSha256) ||
        !isSha(statement.curatorSubjectSha256) ||
        statement.contributorSubjectSha256 === statement.curatorSubjectSha256) {
      return deny('authorization_scope_invalid');
    }
    if (!statement.evidence || EVIDENCE.some(name => !isSha(statement.evidence[name]))) {
      return deny('required_evidence_missing');
    }
    // Each receipt hash must refer to a distinct independently archived proof.
    if (new Set(EVIDENCE.map(name => statement.evidence[name])).size !== EVIDENCE.length) {
      return deny('evidence_not_independent');
    }
    const issued = dateMillis(statement.issuedAt);
    const expiry = dateMillis(statement.expiresAt);
    const current = dateMillis(now());
    if (![issued, expiry, current].every(Number.isFinite) ||
        issued > current + 30_000 || expiry <= current ||
        expiry - issued > 4 * 60 * 60_000 || current < issued - 30_000) {
      return deny('authorization_expired_or_invalid');
    }

    if (!trustKeys || typeof trustKeys !== 'object' ||
        typeof trustKeys.operator !== 'string' || typeof trustKeys.security !== 'string' ||
        !Array.isArray(envelope.signatures) || envelope.signatures.length !== 2) {
      return deny('two_signers_required');
    }
    const operator = createPublicKey(trustKeys.operator);
    const security = createPublicKey(trustKeys.security);
    if (operator.asymmetricKeyType !== 'ed25519' || security.asymmetricKeyType !== 'ed25519') {
      return deny('invalid_signer_key_type');
    }
    const operatorKey = operator.export({ type: 'spki', format: 'der' });
    const securityKey = security.export({ type: 'spki', format: 'der' });
    if (operatorKey.equals(securityKey)) return deny('signers_not_independent');

    const signatures = new Map();
    for (const item of envelope.signatures) {
      if (!item || !['operator', 'security'].includes(item.role) ||
          signatures.has(item.role) || typeof item.signature !== 'string' ||
          item.signature.length > 128 || !B64URL.test(item.signature)) {
        return deny('invalid_signatures');
      }
      const bytes = Buffer.from(item.signature, 'base64url');
      if (bytes.length !== 64 || bytes.toString('base64url') !== item.signature) {
        return deny('invalid_signatures');
      }
      signatures.set(item.role, bytes);
    }
    if (!signatures.has('operator') || !signatures.has('security') ||
        !verifyEd25519(null, raw, operator, signatures.get('operator')) ||
        !verifyEd25519(null, raw, security, signatures.get('security'))) {
      return deny('signatures_not_verified');
    }

    if (!ledger || typeof ledger.inspectRuntimeSecurity !== 'function') {
      return deny('durable_ledger_not_certified');
    }
    const posture = await ledger.inspectRuntimeSecurity();
    if (posture?.leastPrivilegeVerified !== true ||
        posture?.productionDatabaseEligible !== true ||
        posture?.auditChainVerified !== true ||
        posture?.pilotOneRecordLimitConfigured !== true ||
        posture.databaseFingerprint !== statement.databaseFingerprint) {
      return deny('database_or_audit_not_certified');
    }

    return Object.freeze({
      authorized: true,
      reason: 'signed_single_record_pilot',
      expiresAt: statement.expiresAt,
      certificateSha256: createHash('sha256').update(raw).digest('hex'),
      contributorSubjectSha256: statement.contributorSubjectSha256,
      curatorSubjectSha256: statement.curatorSubjectSha256
    });
  } catch {
    // Unavailable PostgreSQL, unreadable trust key, malformed data or invalid
    // signature must never activate a write route.
    return deny('authorization_verification_unavailable');
  }
}
