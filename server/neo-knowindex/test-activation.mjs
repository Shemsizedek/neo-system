// Test-only fixture: creates transient independent Ed25519 keys.
// Import ONLY from *.test.mjs, never from a deployment entrypoint.
import { generateKeyPairSync, sign } from 'node:crypto';
import { sha256Hex } from './production-activation.mjs';

export const KI018_TEST_DEPLOYMENT = 'a'.repeat(40);
export const KI018_TEST_DB = 'b'.repeat(64);

export function prepareTestKi018Activation(ledger, {
  contributor = 'google:alice',
  curator = 'google:bob',
  issuedAt = '2026-10-23T11:30:00.000Z',
  expiresAt = '2026-10-23T15:00:00.000Z',
  deploymentSha = KI018_TEST_DEPLOYMENT,
  databaseFingerprint = KI018_TEST_DB
} = {}) {
  const operator = generateKeyPairSync('ed25519');
  const security = generateKeyPairSync('ed25519');
  const statement = {
    schemaVersion: 1,
    gate: 'KI-018',
    purpose: 'knowindex-single-contribution-pilot',
    environment: 'production',
    service: 'neo-platform-api-recovery',
    deploymentSha,
    databaseFingerprint,
    contributorSubjectSha256: sha256Hex(contributor),
    curatorSubjectSha256: sha256Hex(curator),
    maxTotalSubmissions: 1,
    issuedAt,
    expiresAt,
    evidence: {
      cloudRunIssuerAndIam: sha256Hex('test-only-issuer-and-iam-evidence'),
      liveContributorIdentity: sha256Hex('test-only-member-evidence'),
      independentCuratorRole: sha256Hex('test-only-curator-evidence'),
      dedicatedDatabaseOwnership: sha256Hex('test-only-database-ownership-evidence'),
      offHostBackupRestore: sha256Hex('test-only-backup-and-restore-evidence'),
      emergencyDisableDrill: sha256Hex('test-only-rollback-evidence')
    }
  };
  const signEnvelope = nextStatement => {
    const raw = Buffer.from(JSON.stringify(nextStatement));
    return {
      payload: raw.toString('base64url'),
      signatures: [
        { role: 'operator', signature: sign(null, raw, operator.privateKey).toString('base64url') },
        { role: 'security', signature: sign(null, raw, security.privateKey).toString('base64url') }
      ]
    };
  };
  const envelope = signEnvelope(statement);
  const trustKeys = {
    operator: operator.publicKey.export({ type: 'spki', format: 'pem' }),
    security: security.publicKey.export({ type: 'spki', format: 'pem' })
  };
  if (ledger) {
    ledger.inspectRuntimeSecurity = async () => ({
      leastPrivilegeVerified: true,
      productionDatabaseEligible: true,
      auditChainVerified: true,
      pilotOneRecordLimitConfigured: true,
      databaseFingerprint
    });
  }
  return { envelope, trustKeys, deploymentSha, statement, signEnvelope };
}
