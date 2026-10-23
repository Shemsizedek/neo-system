// KI-021 protected Cloud Run/Secret Manager IAM metadata audit.
// NEVER fetches secret values or performs IAM changes. No account IDs,
// secret identifiers, key versions, emails, or tokens are printed.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectNeopassCloudRunMetadata } from './ki016-gcp-readonly-audit.mjs';

const EXPECTED_SERVICE = 'neo-temple-giss';
const RESTRICTED_ROLES = new Set([
  'roles/owner', 'roles/editor',
  'roles/secretmanager.admin',
  'roles/secretmanager.secretVersionManager'
]);
const SECRET_NAME = /^[a-zA-Z0-9_-]{1,255}$/;
const PROJECT_ID = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/;
const SERVICE_ACCOUNT = /^[a-z][a-z0-9-]{4,29}@[a-z][a-z0-9-]{4,61}[a-z0-9]\.iam\.gserviceaccount\.com$/;

function safeReference(resource, projectId) {
  if (typeof resource !== 'string') return null;
  if (SECRET_NAME.test(resource)) return resource;
  const match = /^projects\/([a-z][a-z0-9-]{4,61}[a-z0-9])\/secrets\/([a-zA-Z0-9_-]{1,255})$/.exec(resource);
  return match?.[1] === projectId ? match[2] : null;
}

export function extractGissIamTarget(service, { projectId } = {}) {
  if (!PROJECT_ID.test(projectId || '') ||
      (service?.metadata?.name || service?.name) !== EXPECTED_SERVICE) return null;
  const containers = service?.spec?.template?.spec?.containers ||
    service?.template?.containers || [];
  if (!Array.isArray(containers)) return null;
  const matching = containers.flatMap(container => Array.isArray(container.env)
    ? container.env.filter(entry => entry?.name === 'NEO_PASS_JWT_SECRET') : []);
  if (matching.length !== 1 || matching[0].value != null) return null;

  const ref = matching[0].valueFrom?.secretKeyRef ||
    matching[0].valueSource?.secretKeyRef;
  const version = ref?.key || ref?.version;
  const secretName = safeReference(ref?.name || ref?.secret, projectId);
  const serviceAccount = service?.spec?.template?.spec?.serviceAccountName ||
    service?.template?.serviceAccount;
  if (!secretName || typeof version !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(version) ||
      !SERVICE_ACCOUNT.test(serviceAccount || '')) return null;
  return Object.freeze({ secretName, serviceAccount, projectId });
}

export function inspectGissSecretIamPolicy({ service, policy, projectId } = {}) {
  const metadata = inspectNeopassCloudRunMetadata(service);
  const target = extractGissIamTarget(service, { projectId });
  const policyReadable = policy && typeof policy === 'object' && !Array.isArray(policy) &&
    Array.isArray(policy.bindings);
  const member = target ? 'serviceAccount:' + target.serviceAccount : '';
  let direct = false, conditional = false, broad = false;
  if (policyReadable && target) {
    for (const binding of policy.bindings) {
      if (!binding || !Array.isArray(binding.members) || !binding.members.includes(member)) continue;
      if (binding.role === 'roles/secretmanager.secretAccessor') {
        if (binding.condition) conditional = true;
        else direct = true;
      }
      if (RESTRICTED_ROLES.has(binding.role)) broad = true;
    }
  }
  const ready = metadata.metadataReady === true &&
    metadata.issuerExplicitlyConfigured === true &&
    Boolean(target) && Boolean(policyReadable) && direct && !broad;

  // Secret-level IAM policy is not a test of effective runtime access:
  // project/group inheritance, deny policies, service rollout and Secret
  // Manager API availability must be evaluated independently.
  return Object.freeze({
    gate: 'KI-021',
    proofLevel: 'protected-cloud-run-and-secret-policy-metadata',
    serviceIdentityBound: Boolean(target),
    signingSecretReferenceValid: Boolean(target),
    issuerConfigured: metadata.issuerExplicitlyConfigured === true,
    oauthClientConfigured: metadata.oauthClientConfigured === true,
    metadataReady: metadata.metadataReady === true,
    secretIamPolicyReadable: Boolean(policyReadable),
    directUnconditionalSecretAccessorGrantObserved: direct,
    conditionalSecretAccessorGrantObserved: conditional,
    overprivilegedSecretRoleObserved: broad,
    secretBindingAndDirectGrantObserved: ready,
    actualEffectiveRuntimeSecretAccessVerified: false,
    actualTokenIssuedAndVerified: false,
    realContributorAndCuratorVerified: false,
    productionBackupAndRestoreVerified: false,
    productionWritesApproved: false,
    status: ready ? 'DIRECT_IAM_BINDING_OBSERVED_ONLY' : 'BLOCKED',
    nextAction: ready
      ? 'Verify effective runtime read, issuer, active registry identities and separately backed-up KNOWINDEX storage'
      : 'Resolve Cloud Run, Secret Manager policy, issuer or scoped IAM configuration without exposing secret contents'
  });
}

async function cli() {
  const [mode, servicePath, secondPath] = process.argv.slice(2);
  const projectId = process.env.GCP_PROJECT_ID;
  const service = JSON.parse(await fs.readFile(servicePath, 'utf8'));
  if (mode === 'extract-ref') {
    if (!secondPath || !process.env.RUNNER_TEMP ||
        path.dirname(path.resolve(secondPath)) !== path.resolve(process.env.RUNNER_TEMP)) {
      throw new Error('private_runner_output_required');
    }
    const target = extractGissIamTarget(service, { projectId });
    if (!target) throw new Error('giss_reference_unavailable');
    await fs.writeFile(secondPath, target.secretName + '\n', { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ gate: 'KI-021', secretReferenceAvailable: true, secretNamePrinted: false }));
    return;
  }
  if (mode !== 'evaluate' || !secondPath) throw new Error('invalid_audit_mode');
  const policy = JSON.parse(await fs.readFile(secondPath, 'utf8'));
  const result = inspectGissSecretIamPolicy({ service, policy, projectId });
  console.log(JSON.stringify(result));
  if (!result.secretBindingAndDirectGrantObserved) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await cli();
  } catch {
    // Intentionally omit raw cloud errors, identities, filesystem locations
    // and policy content from GitHub Actions logs.
    console.error('KI-021 protected IAM audit BLOCKED: missing or inconsistent configuration, policy, or permissions');
    process.exitCode = 1;
  }
}
