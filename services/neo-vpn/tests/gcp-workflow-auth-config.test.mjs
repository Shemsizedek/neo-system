import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const flow = readFileSync(
  new URL('../../../.github/workflows/global-neo-ip-net-003.yml', import.meta.url),
  'utf8'
);

test('NET-005 accepts only the existing authorized GCP WIF configuration', () => {
  for (const key of ['GCP_PROJECT_ID', 'GCP_WIF_PROVIDER', 'GCP_SERVICE_ACCOUNT']) {
    assert.ok(flow.includes(key + ': ${{ vars.' + key + ' || secrets.' + key + ' }}'), key);
    assert.ok(flow.includes('Missing approved GCP configuration: $key'))
  }
  assert.match(flow, /environment: neo-vpn-plan/);
  assert.match(flow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(flow, /github\.repository == 'Shemsizedek\/neo-system'/);
});

test('preflight validates canonical WIF resource and stops before authentication on missing values', () => {
  assert.match(flow, /if \(\( missing \)\); then[\s\S]*?exit 1[\s\S]*?fi/);
  assert.match(flow, /projects\/\[0-9\]\+\/locations\/global\/workloadIdentityPools/);
  assert.match(flow, /GCP_WIF_PROVIDER is not a canonical Workload Identity provider resource name/);
});

test('read-only GCP audit never provisions resources or uses broader service-account fallback', () => {
  const {output}=flow.match(/- name: Inventory existing Compute resources \(list ONLY\)(?<output>[\s\S]*?)- name: Publish restricted summary/)?.groups??{};
  assert.ok(output);
  assert.match(output, /gcloud compute instances list/);
  assert.match(output, /gcloud compute addresses list/);
  assert.doesNotMatch(output, /gcloud compute (instances|addresses) (create|update|delete|start|stop)/);
  assert.doesNotMatch(flow, /GCP_CLOUD_RUN_SERVICE_ACCOUNT/);
  assert.doesNotMatch(flow, /terraform (apply|destroy)/);
  assert.doesNotMatch(flow, /service_account: \$\{\{ (vars|secrets)\./);
});
