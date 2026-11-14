#!/usr/bin/env node
// NEO-CONNECT-005: Android Termux storage/connectivity diagnostic.
// Read-only, no root, no systemctl, no Wi-Fi toggles, no VPN enrollment.
// Does NOT print SSIDs, IP addresses, routes, shell variables, keys or raw headers.
import { statfsSync } from 'node:fs';
import { request } from 'node:https';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const TARGETS = Object.freeze([
  { name: 'PUBLIC_HTTPS', url: 'https://example.org/' },
  { name: 'SENTINELX_WEB', url: 'https://mcp.sentinelx.app/' },
]);

export function classifyStorage(stat) {
  if (!stat || stat.blocks == null || stat.bsize == null || stat.bavail == null) {
    return { class: 'UNKNOWN' };
  }
  try {
    const blockSize = BigInt(stat.bsize), blocks = BigInt(stat.blocks),
      availableBlocks = BigInt(stat.bavail);
    if (blockSize <= 0n || blocks <= 0n || availableBlocks < 0n ||
        availableBlocks > blocks) return { class: 'UNKNOWN' };
    const freeMiB = Number((availableBlocks * blockSize) / 1048576n);
    const totalMiB = Number((blocks * blockSize) / 1048576n);
    return { class: freeMiB < 100 ? 'CRITICAL' : freeMiB < 1024 ? 'LOW' : 'OK',
      free_mib: freeMiB, total_mib: totalMiB };
  } catch { return { class: 'UNKNOWN' }; }
}

export function snapshotStorage(path, getStat = statfsSync) {
  if (typeof path !== 'string' || !path.startsWith('/')) return { class: 'UNAVAILABLE' };
  try { return classifyStorage(getStat(path)); }
  catch { return { class: 'UNAVAILABLE' }; }
}

export function head(url, timeoutMs = 6000) {
  if (!TARGETS.some(t => t.url === url)) return Promise.resolve('BLOCKED_TARGET');
  return new Promise((finish) => {
    let done = false;
    let req;
    const complete = x => {
      if (done) return;
      done = true;
      if (req) req.destroy();
      finish(x);
    };
    try {
      req = request(url, { method: 'HEAD', timeout: timeoutMs }, res => {
        res.resume();
        complete(res.statusCode >= 200 && res.statusCode < 400 ? 'PASS' : 'FAIL');
      });
      req.on('timeout', () => complete('TIMEOUT'));
      req.on('error', () => complete('FAIL'));
      req.end();
    } catch { complete('FAIL'); }
  });
}

export async function assess({
  env = process.env, node = process.versions.node, getStat = statfsSync,
  probe = head, offline = false, now = () => new Date().toISOString()
} = {}) {
  const prefix = env.PREFIX || '';
  const home = env.HOME || '';
  const termux = Boolean(env.TERMUX_VERSION ||
    (prefix.includes('/com.termux/') && prefix.endsWith('/files/usr')));
  const storage = {
    termux_home: snapshotStorage(home, getStat),
    termux_prefix: snapshotStorage(prefix, getStat),
  };
  const checks = [];
  if (!offline) {
    for (const target of TARGETS) {
      let state = 'UNAVAILABLE';
      try {
        const result = await probe(target.url);
        state = ['PASS', 'FAIL', 'TIMEOUT', 'BLOCKED_TARGET'].includes(result)
          ? result : 'UNAVAILABLE';
      } catch {}
      checks.push({ target: target.name, result: state });
    }
  }
  const notes = [];
  if (!termux) notes.push('TERMUX_RUNTIME_NOT_CONFIRMED');
  if (Object.values(storage).some(x => x.class === 'LOW' || x.class === 'CRITICAL')) {
    notes.push('TERMUX_DATA_FILESYSTEM_LOW_SPACE');
  }
  if (Object.values(storage).some(x => x.class === 'UNKNOWN' || x.class === 'UNAVAILABLE')) {
    notes.push('TERMUX_DATA_FILESYSTEM_UNVERIFIED');
  }
  if (offline) notes.push('NETWORK_NOT_TESTED');
  else if (checks.some(x=>x.result!=='PASS')) notes.push('HTTPS_PATH_REQUIRES_REVIEW');
  return {
    schema: 'neo.connect.005.termux-diagnostic.v1',
    source: 'ANDROID_TERMUX_LOCAL',
    observed_at: now(),
    detected_termux: termux,
    node_version: node,
    storage,
    https: checks,
    flags: notes,
    status: offline ? 'OFFLINE_CHECK_ONLY' :
      checks.every(x=>x.result==='PASS') ? 'PHONE_HTTPS_REACHABLE' : 'PHONE_HTTPS_NOT_CONFIRMED',
    root_filesystem_assessed: false,
    linux_systemd_host_checked: false,
    remote_crown_node_verified: false,
    netbird_wireguard_handshake_verified: false,
    wifi_signal_or_coverage_measured: false,
    cellular_failover_verified: false,
    production_authorized: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(await assess({offline:process.argv.includes('--offline')}),null,2)+'\n'); }
  catch { process.stdout.write('{"schema":"neo.connect.005.termux-diagnostic.v1","status":"UNAVAILABLE"}\n'); process.exitCode=2; }
}
