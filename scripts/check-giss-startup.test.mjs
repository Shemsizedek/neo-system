import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { INPUTS, assessGissStartup } from './check-giss-startup.mjs';

test('all sixteen prerequisite combinations match the deployed bootstrap condition', () => {
  for (let bits = 0; bits < 16; bits++) {
    const flags = Object.fromEntries(INPUTS.map((key, i) => [key, Boolean(bits & (1 << i))]));
    const expected = (flags.GOOGLE_CLOUD_PROJECT || flags.GCP_PROJECT_ID)
      && flags.NEO_PASS_JWT_SECRET && flags.GOOGLE_OAUTH_CLIENT_ID;
    const report = assessGissStartup(flags);
    assert.equal(report.prerequisitesPresent, expected);
    assert.equal(report.expectedBootstrap, expected ? 'attempt-giss-production' : 'fallback-without-auth-service');
    assert.equal(report.authentication, 'not-tested');
    assert.equal(report.firestoreAccess, 'unverified');
  }
});

test('unknown, missing and nonboolean inputs cannot be mistaken for verified presence', () => {
  const valid = Object.fromEntries(INPUTS.map(key => [key, true]));
  for (const input of [null, [], {}, {...valid, extra:true}, {...valid, NEO_PASS_JWT_SECRET:'SYNTHETIC_TEST_VALUE'}]) {
    assert.throws(() => assessGissStartup(input));
  }
});

const script = fileURLToPath(new URL('./check-giss-startup.mjs', import.meta.url));
test('CLI suppresses every supplied value and unrelated environment entries', () => {
  const output = execFileSync(process.execPath, [script], {
    encoding:'utf8', env: Object.fromEntries([...INPUTS.map(key => [key, 'SYNTHETIC_TEST_VALUE']), ['UNRELATED', 'PRIVATE_TEST_MARKER']]),
  });
  assert.equal(output.includes('SYNTHETIC_TEST_VALUE'), false);
  assert.equal(output.includes('PRIVATE_TEST_MARKER'), false);
  assert.equal(output.includes('UNRELATED'), false);
  assert.equal(JSON.parse(output).prerequisitesPresent, true);
});

test('CLI reports missing names and exit 2 with an empty environment', () => {
  const result = spawnSync(process.execPath, [script], {encoding:'utf8', env:{}});
  assert.equal(result.status, 2);
  assert.deepEqual(JSON.parse(result.stdout).missingRequirements,
    ['GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID', 'NEO_PASS_JWT_SECRET', 'GOOGLE_OAUTH_CLIENT_ID']);
});

test('CLI refuses command-line configuration and never echoes arguments', () => {
  const result = spawnSync(process.execPath, [script, 'SYNTHETIC_TEST_VALUE'], {encoding:'utf8', env:{}});
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.includes('SYNTHETIC_TEST_VALUE'), false);
});
