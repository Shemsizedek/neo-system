import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedLocalCommands, executeLocalReadOnly, sanitizeLocalOutput } from './local-executor.mjs';

test('local executor exposes only typed read-only commands', () => {
  assert.deepEqual(allowedLocalCommands().sort(), ['vpn-audit', 'vpn-runtime-status']);
});

test('local executor rejects arbitrary commands before process execution', async () => {
  await assert.rejects(
    () => executeLocalReadOnly('bash -c whoami'),
    /local-command-not-allowlisted/
  );
});

test('local executor redacts WireGuard public keys from Discord output', () => {
  const key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const output = sanitizeLocalOutput(`peer ${key} mismatch`);
  assert.equal(output, 'peer [public-key] mismatch');
});

test('local executor truncates oversized output', () => {
  const output = sanitizeLocalOutput('x'.repeat(1700), 100);
  assert.match(output, /^x{100}\n\[output truncated\]$/);
});
