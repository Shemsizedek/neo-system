import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../diagnostics/direct-gcp-readonly.sh', import.meta.url));

function runFake(extraEnv = {}) {
  const folder = mkdtempSync(join(tmpdir(), 'neo-ip-net006-'));
  const trace = join(folder, 'gcloud-calls.txt');
  const fake = join(folder, 'gcloud');
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require('node:fs');
const a=process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_AUDIT_TRACE, a.join(' ') + '\\n');
if(a[0]==='config' && a[1]==='get-value') { console.log('neo-example-project'); process.exit(0); }
if(a[0]==='projects' && a[1]==='describe') { console.log('12345'); process.exit(0); }
if(a[0]==='compute' && a[1]==='instances' && a[2]==='list') {
  if(process.env.FAKE_COMPUTE_DENIED==='1')process.exit(1);
  console.log(JSON.stringify([{name:'neo-vpn-node-001',status:'RUNNING',canIpForward:true,
    networkInterfaces:[{accessConfigs:[{natIP:'198.51.100.20'}]}]}]));process.exit(0);
}
if(a[0]==='compute' && a[1]==='addresses' && a[2]==='list') {
  console.log(JSON.stringify([{address:'198.51.100.20',status:'IN_USE',addressType:'EXTERNAL'}]));
  process.exit(0);
}
if(a[0]==='iam' && a[1]==='workload-identity-pools') {
  if(process.env.FAKE_NO_WIF==='1')process.exit(1);
  console.log(JSON.stringify({state:'ACTIVE',disabled:false,
    attributeCondition:"assertion.repository=='Shemsizedek/neo-system' && assertion.ref=='refs/heads/main'"}));
  process.exit(0);
}
if(a[0]==='iam' && a[1]==='service-accounts') {
  console.log('neo-vpn-deployer@neo-example-project.iam.gserviceaccount.com');process.exit(0);
}
console.error('Unexpected read command:',a[0],a[1],a[2]);process.exit(99);
`);
  chmodSync(fake, 0o700);
  const result = spawnSync('bash', [script], {
    encoding: 'utf8',
    env: {...process.env, PATH: folder + ':' + process.env.PATH,
      GCP_PROJECT_ID: 'neo-example-project', FAKE_AUDIT_TRACE:trace, ...extraEnv}
  });
  const calls = readFileSync(trace,'utf8').trim().split('\n').filter(Boolean);
  rmSync(folder, { recursive: true, force: true });
  return {...result, calls};
}

test('directly inventories existing GCP VM independently of GitHub WIF', () => {
  const a = runFake();
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /"inventory": "FOUND"/);
  assert.match(a.stdout, /WIF_PROVIDER_SCOPE=APPEARS_ACTIVE_AND_MAIN_RESTRICTED/);
  assert.match(a.stdout, /WIF_PROVIDER_RESOURCE=projects\/12345\/locations\/global\/workloadIdentityPools\/github\/providers\/neo-system/);
  assert.match(a.stdout, /NODE_LIVE=NOT_CERTIFIED/);
  assert.match(a.stdout, /NO_CLOUD_MUTATION=TRUE/);
  assert.doesNotMatch(a.stdout, /198\.51\.100\.20/);
  assert.equal(a.calls.length, 5);
});

test('missing WIF does not obstruct an authorized direct compute inventory', () => {
  const a = runFake({FAKE_NO_WIF:'1'});
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /"inventory": "FOUND"/);
  assert.match(a.stdout, /WIF_PROVIDER_SCOPE=NOT_FOUND_OR_ACCESS_DENIED_FOR_THIS_POOL/);
  assert.match(a.stdout, /NODE_LIVE=NOT_CERTIFIED/);
});

test('Compute API denied is an unverified network, not absent', () => {
  const a = runFake({FAKE_COMPUTE_DENIED:'1'});
  assert.equal(a.status, 4);
  assert.match(a.stdout, /COMPUTE_INVENTORY=UNVERIFIED_OR_DENIED/);
  assert.match(a.stdout, /NODE_LIVE=NOT_CERTIFIED/);
  assert.doesNotMatch(a.stdout, /NOT_FOUND_IN_AUTHORIZED_PROJECT/);
});

test('all issued cloud commands are resource read-only', () => {
  const a = runFake();
  for (const call of a.calls) {
    assert.match(call, /^(projects describe|compute instances list|compute addresses list|iam workload-identity-pools providers describe|iam service-accounts describe)\b/, call);
    assert.doesNotMatch(call, /\b(create|delete|update|apply|enable|policy-binding)\b/);
  }
});

test('shell script parses and contains no cloud mutations', () => {
  const a = spawnSync('bash', ['-n', script], {encoding:'utf8'});
  assert.equal(a.status, 0, a.stderr);
  const content=readFileSync(script,'utf8');
  assert.doesNotMatch(content, /^\s*gcloud\s+(compute|iam|services)\s+.*\b(create|update|delete|enable|add-iam-policy-binding)\b/m);
  assert.doesNotMatch(content, /^\s*terraform\s+(apply|destroy)/m);
});
