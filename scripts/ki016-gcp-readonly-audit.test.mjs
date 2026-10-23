import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectNeopassCloudRunMetadata } from './ki016-gcp-readonly-audit.mjs';

const service = (env = [], name = 'neo-temple-giss') => ({
  metadata: { name },
  spec: {
    template: {
      spec: {
        serviceAccountName: 'sensitive-service-account@private-project.iam.gserviceaccount.com',
        containers: [{ env }]
      }
    }
  }
});
const binding = [
  { name: 'NEO_PASS_JWT_SECRET', valueFrom: { secretKeyRef: { name: 'neo-pass-jwt-secret', key: 'latest' } } },
  { name: 'GOOGLE_OAUTH_CLIENT_ID', value: 'sensitive-client-id-value.apps.googleusercontent.com' },
  { name: 'NEO_PASS_JWT_ISSUER', value: 'neo-pass' }
];

test('KI-016 reports only boolean signing-key binding metadata, no secrets or identity names', () => {
  const value = service(binding);
  const result = inspectNeopassCloudRunMetadata(value);
  assert.equal(result.metadataReady, true);
  assert.equal(result.actualTokenIssuedAndVerified, false);
  assert.equal(result.liveWriteAuthorization, false);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('sensitive-client-id-value'), false);
  assert.equal(serialized.includes('sensitive-service-account'), false);
  assert.equal(serialized.includes('neo-pass-jwt-secret'), false);
});

test('KI-016 rejects unconfigured signing identity or literal secret exposure', () => {
  const notReady = inspectNeopassCloudRunMetadata(service([
    { name: 'NEO_PASS_JWT_SECRET', value: 'a-sensitive-unmanaged-literal-key' },
    { name: 'GOOGLE_OAUTH_CLIENT_ID', value: 'client' }
  ]));
  assert.equal(notReady.metadataReady, false);
  assert.equal(notReady.signingSecretLiteralPresent, true);
  assert.equal(notReady.signingSecretBoundToSecretManager, false);
});

test('KI-016 missing OAuth and runtime account cannot falsely certify production', () => {
  const s = service([binding[0]]);
  s.spec.template.spec.serviceAccountName = '';
  const checked = inspectNeopassCloudRunMetadata(s);
  assert.equal(checked.metadataReady, false);
  assert.equal(checked.oauthClientConfigured, false);
  assert.equal(checked.runtimeIdentityBound, false);
});

test('KI-016 metadata success does not claim active curator, restore or live write readiness', () => {
  const checked = inspectNeopassCloudRunMetadata(service(binding));
  assert.equal(checked.independentCuratorVerified, false);
  assert.equal(checked.activeContributorVerified, false);
  assert.equal(checked.actualTokenIssuedAndVerified, false);
  assert.equal(checked.liveWriteAuthorization, false);
});
