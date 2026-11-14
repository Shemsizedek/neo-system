#!/usr/bin/env node
// NEO-CONNECT-002 read-only local Linux NetBird preflight.
// No enrollments, routing, authentication, policy changes, secrets or raw CLI output.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const CHECKS = ['live', 'ready', 'startup'];

export function preflight({ run = spawnSync, now = () => new Date().toISOString() } = {}) {
  const results = {};
  let installed = true;
  for (const check of CHECKS) {
    if (!installed) {
      results[check] = 'NOT_TESTED';
      continue;
    }
    try {
      const p = run('netbird', ['status', '--check', check], {
        encoding: 'utf8', timeout: 5000, windowsHide: true,
        shell: false, maxBuffer: 256 * 1024,
      });
      if (p?.error?.code === 'ENOENT') {
        installed = false;
        results[check] = 'NOT_INSTALLED';
      } else {
        results[check] = p?.status === 0 ? 'PASS' : 'FAIL';
      }
    } catch {
      results[check] = 'UNAVAILABLE';
    }
  }
  return {
    gate: 'NEO-CONNECT-002',
    source: 'LOCAL_LINUX_NETBIRD_READ_ONLY',
    checked_at_utc: now(),
    client_installed: installed,
    daemon_checks: results,
    encrypted_peer_handshake_verified: false,
    application_traffic_verified: false,
    production_authorized: false,
    decision: 'HOLD_FOR_INDEPENDENT_PEER_AND_POLICY_TESTS',
    limitations: 'Daemon checks do not establish peer connectivity, routing, successful application traffic or failover.',
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.stdout.write(JSON.stringify(preflight(), null, 2) + '\n');
}
