#!/usr/bin/env node
// NEO-CONNECT-003: bounded read-only connectivity observation. NO network toggling.
import { request } from 'node:https';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const PHASES = Object.freeze(['wifi_baseline', 'cellular_backup', 'wifi_restored']);
export const TARGETS = Object.freeze(['https://example.org/', 'https://www.iana.org/']);

export function probeHttps(url, timeoutMs = 4500) {
  if (!TARGETS.includes(url)) return Promise.resolve('BLOCKED_TARGET');
  return new Promise((done) => {
    let finished = false;
    const finish = (value) => { if (!finished) { finished = true; done(value); } };
    try {
      const req = request(url, { method: 'HEAD', timeout: timeoutMs,
        headers: { 'user-agent': 'NEO-Connect-003-ReadOnly/1' } }, (res) => {
        finish(res.statusCode >= 200 && res.statusCode < 300 ? 'PASS' : 'FAIL');
        res.resume();
      });
      req.on('timeout', () => { req.destroy(); finish('TIMEOUT'); });
      req.on('error', () => finish('FAIL'));
      req.end();
    } catch { finish('FAIL'); }
  });
}

export function checkLocalNetBird(run = spawnSync) {
  try {
    const p = run('netbird', ['status', '--check', 'startup'], {
      timeout: 5000, encoding: 'utf8', shell: false, windowsHide: true,
      maxBuffer: 65536,
    });
    if (p?.error?.code === 'ENOENT') return 'NOT_AVAILABLE';
    return p?.status === 0 ? 'PASS' : 'FAIL';
  } catch { return 'NOT_AVAILABLE'; }
}

export async function observe(phase, { probe = probeHttps, run = spawnSync,
  now = () => new Date().toISOString() } = {}) {
  if (!PHASES.includes(phase)) throw new Error('INVALID_PHASE');
  const httpsChecks = [];
  for (const target of TARGETS) {
    httpsChecks.push({ target_label: TARGETS.indexOf(target) === 0 ? 'PUBLIC_A' : 'PUBLIC_B',
      result: await probe(target) });
  }
  return {
    gate: 'NEO-CONNECT-003', schema: 'neo.connect.003.local-probe.v1',
    source: 'LOCAL_DEVICE_OBSERVATION', observed_at: now(),
    operator_labeled_phase: phase,
    target_results: httpsChecks,
    netbird_daemon_startup: checkLocalNetBird(run),
    phase_and_interface_independently_verified: false,
    encrypted_peer_handshake_verified: false,
    failover_verified: false,
    classification: 'OBSERVATION_ONLY',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const phaseIndex = process.argv.indexOf('--phase');
  const phase = phaseIndex >= 0 ? process.argv[phaseIndex + 1] : null;
  if (!PHASES.includes(phase)) {
    process.stderr.write('Usage: node connect-003-probe.mjs --phase wifi_baseline|cellular_backup|wifi_restored\n');
    process.exitCode = 2;
  } else {
    try {
      const result = await observe(phase);
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      if (result.target_results.some((x) => x.result !== 'PASS')) process.exitCode = 2;
    } catch { process.stderr.write('NEO-CONNECT-003: observation unavailable\n'); process.exitCode = 2; }
  }
}
