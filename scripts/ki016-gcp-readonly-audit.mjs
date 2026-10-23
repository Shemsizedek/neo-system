import fs from 'node:fs/promises';

const allowedService = 'neo-temple-giss';

export function inspectNeopassCloudRunMetadata(service) {
  const containers = service?.spec?.template?.spec?.containers ||
    service?.template?.containers || [];
  const entries = containers.flatMap(container => container.env || []);
  const named = name => entries.find(entry => entry.name === name);
  const key = named('NEO_PASS_JWT_SECRET');
  const keyRef = key?.valueFrom?.secretKeyRef || key?.valueSource?.secretKeyRef;
  const runtimeIdentity = service?.spec?.template?.spec?.serviceAccountName ||
    service?.template?.serviceAccount || '';
  const issuer = named('NEO_PASS_JWT_ISSUER');
  const issuerPresent = Boolean(issuer && (issuer.value || issuer.valueFrom || issuer.valueSource));
  const googleClient = named('GOOGLE_OAUTH_CLIENT_ID');
  const clientPresent = Boolean(googleClient && (googleClient.value || googleClient.valueFrom || googleClient.valueSource));

  const report = {
    gate: 'KI-016',
    proofLevel: 'cloud-run-metadata-only',
    serviceMetadataReadable: Boolean(service?.metadata?.name || service?.name),
    runtimeIdentityBound: Boolean(runtimeIdentity),
    signingSecretBoundToSecretManager: Boolean(keyRef?.name || keyRef?.secret),
    signingSecretLiteralPresent: Boolean(key?.value),
    oauthClientConfigured: clientPresent,
    issuerExplicitlyConfigured: issuerPresent,
    registryRuntimeExpected: true,
    actualTokenIssuedAndVerified: false,
    activeContributorVerified: false,
    independentCuratorVerified: false,
    liveWriteAuthorization: false
  };
  report.metadataReady = report.serviceMetadataReadable && report.runtimeIdentityBound &&
    report.signingSecretBoundToSecretManager &&
    !report.signingSecretLiteralPresent && report.oauthClientConfigured;
  return report;
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) throw new Error('cloud_run_metadata_file_required');
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  const name = data?.metadata?.name || data?.name;
  if (name !== allowedService) throw new Error('unexpected_giss_service');
  const result = inspectNeopassCloudRunMetadata(data);
  console.log(JSON.stringify(result)); // No principal, key, email, token or secret contents.
  if (!result.metadataReady) process.exitCode = 1;
}
