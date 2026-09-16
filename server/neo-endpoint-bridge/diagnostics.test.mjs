import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSecurityPosture, listDiagnostics, runDiagnostic, validateSerial } from './diagnostics.mjs';

test('diagnostic inventory is named and does not expose arbitrary shell', () => {
  const names = listDiagnostics();
  assert.ok(names.includes('security.patch'));
  assert.ok(names.includes('debug.wireless'));
  assert.equal(names.includes('shell'), false);
});

test('unsupported diagnostics are denied', async () => {
  await assert.rejects(
    () => runDiagnostic('shell', { serial: '192.168.1.10:5555', execFile: async () => ({ stdout: '' }) }),
    /unsupported_diagnostic/
  );
});

test('serial input rejects command injection characters', () => {
  assert.throws(() => validateSerial('192.168.1.10:5555;rm -rf /'), /invalid_adb_serial/);
  assert.equal(validateSerial('192.168.1.10:5555'), '192.168.1.10:5555');
});

test('runDiagnostic calls adb with fixed argument vector and returns inert data', async () => {
  let seen;
  const fakeExec = async (file, args, options) => {
    seen = { file, args, options };
    return { stdout: '2026-09-01\n', stderr: '' };
  };
  const result = await runDiagnostic('security.patch', {
    serial: '192.168.1.10:5555',
    execFile: fakeExec
  });
  assert.equal(seen.file, 'adb');
  assert.deepEqual(seen.args, ['-s', '192.168.1.10:5555', 'shell', 'getprop', 'ro.build.version.security_patch']);
  assert.equal(result.stdout, '2026-09-01');
  assert.equal(result.arbitraryShell, false);
  assert.equal(result.instructionPolicy, 'DATA_ONLY_NO_EXECUTION');
});

test('posture collection uses only named read-only observations', async () => {
  const calls = [];
  const fakeExec = async (file, args) => {
    calls.push({ file, args });
    return { stdout: 'ok\n', stderr: '' };
  };
  const posture = await collectSecurityPosture({ serial: 'emulator-5554', execFile: fakeExec });
  assert.equal(posture.observations.length, 9);
  assert.equal(posture.evidencePolicy, 'OBSERVATION_NOT_PROOF_OF_COMPROMISE');
  assert.ok(calls.every(call => call.file === 'adb'));
  assert.ok(calls.every(call => !call.args.includes('su')));
});
