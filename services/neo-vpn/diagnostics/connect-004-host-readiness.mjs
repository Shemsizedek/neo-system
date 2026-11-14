#!/usr/bin/env node
// NEO-CONNECT-004: read-only and redacted diagnostics for a NEO-controlled Linux host.
// Never restart services, modify firewall/routes, read private keys, or print raw
// CLI output, IP addresses, usernames, hostnames, endpoint details or credentials.
import { spawnSync } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { connect } from 'node:tls';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const CONTROL_HOST = 'mcp.sentinelx.app';

function runStatus(run, executable, args, timeout = 5000) {
  try {
    const result = run(executable, args, {
      encoding: 'utf8', timeout, windowsHide: true,
      shell: false, maxBuffer: 32768,
    });
    if (result?.error || typeof result?.status !== 'number') return 'UNAVAILABLE';
    return result.status === 0 ? 'PASS' : 'FAIL';
  } catch {
    return 'UNAVAILABLE';
  }
}

function diskUsage(run) {
  try {
    const p = run('df', ['-P', '/'], {
      encoding: 'utf8', timeout: 5000, windowsHide: true,
      shell: false, maxBuffer: 32768,
    });
    if (p?.error || p?.status !== 0) return 'UNKNOWN';
    const lines = String(p.stdout || '').trim().split(/\r?\n/);
    const line = lines.at(-1);
    const match = line?.match(/\s(\d{1,3})%\s/);
    if (!match) return 'UNKNOWN';
    const pct = Number(match[1]);
    if (pct < 0 || pct > 100) return 'UNKNOWN';
    return pct >= 95 ? 'CRITICAL' : pct >= 85 ? 'HIGH' : 'NORMAL';
  } catch { return 'UNKNOWN'; }
}

function tlsHandshake(host, timeoutMs = 5000) {
  return new Promise((finish) => {
    let done = false;
    const complete = (value) => {
      if (done) return;
      done = true;
      finish(value);
    };
    try {
      const socket = connect({
        host, port: 443, servername: host, rejectUnauthorized: true,
      });
      socket.setTimeout(timeoutMs);
      socket.once('secureConnect', () => { socket.destroy(); complete('PASS'); });
      socket.once('timeout', () => { socket.destroy(); complete('FAIL'); });
      socket.once('error', () => { socket.destroy(); complete('FAIL'); });
    } catch { complete('UNAVAILABLE'); }
  });
}

export async function observeHost({
  run = spawnSync, resolveDns = lookup,
  connectTls = tlsHandshake, offline = false,
  now = () => new Date().toISOString(),
} = {}) {
  const agent = runStatus(run, 'systemctl', ['is-active', '--quiet', 'sentinelx-cloud-core']);
  const startup = runStatus(run, 'systemctl', ['is-enabled', '--quiet', 'sentinelx-cloud-core']);
  const netbird = runStatus(run, 'systemctl', ['is-active', '--quiet', 'netbird']);
  const disk = diskUsage(run);
  let dns = 'NOT_TESTED', tls = 'NOT_TESTED';
  if (!offline) {
    try { await resolveDns(CONTROL_HOST); dns = 'PASS'; }
    catch { dns = 'FAIL'; }
    if (dns === 'PASS') {
      try { tls = await connectTls(CONTROL_HOST); }
      catch { tls = 'UNAVAILABLE'; }
    }
  }
  const blockers = [];
  if (agent !== 'PASS') blockers.push('SENTINELX_AGENT_NOT_CONFIRMED_ACTIVE');
  if (startup !== 'PASS') blockers.push('SENTINELX_BOOT_START_NOT_CONFIRMED');
  if (disk === 'HIGH' || disk === 'CRITICAL' || disk === 'UNKNOWN') blockers.push('DISK_STATE_REQUIRES_REVIEW');
  if (dns !== 'PASS') blockers.push('DNS_NOT_CONFIRMED');
  if (tls !== 'PASS') blockers.push('OUTBOUND_TLS_NOT_CONFIRMED');

  return {
    schema: 'neo.connect.004.host-observation.v1',
    gate: 'NEO-CONNECT-004',
    observed_at: now(),
    source: 'LOCAL_LINUX_READ_ONLY',
    sentinelx_service_active: agent,
    sentinelx_boot_enabled: startup,
    netbird_service_active: netbird,
    root_disk_usage_class: disk,
    sentinelx_dns_resolution: dns,
    sentinelx_outbound_tls_443: tls,
    flags: blockers,
    status: blockers.length === 0 ? 'LOCAL_PRECHECK_PASS_REMOTE_CONFIRMATION_REQUIRED' : 'HOLD',
    sentinelx_cloud_connection_verified: false,
    wireguard_handshake_verified: false,
    private_application_traffic_verified: false,
    production_authorized: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const offline = process.argv.includes('--offline');
  const report = await observeHost({ offline });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (report.status === 'HOLD') process.exitCode = 2;
}
