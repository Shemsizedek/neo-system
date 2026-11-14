#!/usr/bin/env node
// NEO-MULTICLOUD-004: read-only, redacted NetBird peer observation on authorized Linux.
// Does not authenticate, connect, disconnect, change routes, or inspect keys.
import { spawnSync } from 'node:child_process';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function isNetBirdIPv4(value) {
  if (typeof value !== 'string' || isIP(value) !== 4) return false;
  const [first, second] = value.split('.').map(Number);
  return first === 100 && second >= 64 && second <= 127;
}

export function assessDetail(raw, peerIp) {
  const hold = (reason) => ({
    peer_status: 'NOT_CONFIRMED', transport: 'UNKNOWN', handshake: 'NOT_CONFIRMED',
    reason,
  });
  if (!isNetBirdIPv4(peerIp) || typeof raw !== 'string' || raw.length > 131072) {
    return hold('INVALID_LOCAL_OBSERVATION');
  }
  const matches = [...raw.matchAll(/^\s*NetBird IP:\s*(\S+)\s*$/gim)];
  const index = matches.findIndex(m => m[1] === peerIp);
  if (index < 0) return hold('TARGET_PEER_NOT_IN_STATUS');
  // Bound all parsing to this exact peer, not overall daemon status or another peer.
  const start = matches[index].index;
  const next = matches[index + 1]?.index ?? raw.length;
  let block = raw.slice(start, next);
  const footer = block.search(/^\s*(?:OS|Daemon version|CLI version|Management|Signal|Relays|Nameservers|Peers count):/mi);
  if (footer >= 0) block = block.slice(0, footer);
  const status = block.match(/^\s*Status:\s*(Connected|Disconnected|Connecting|Idle)\s*$/mi)?.[1]?.toLowerCase();
  const type = block.match(/^\s*Connection type:\s*(P2P|Relayed)\s*$/mi)?.[1]?.toLowerCase();
  const handshake = block.match(/^\s*Last WireGuard handshake:\s*(.*?)\s*$/mi)?.[1] ?? '';
  let freshness = 'NOT_CONFIRMED';
  const age = handshake.match(/^(\d+)\s*(seconds?|minutes?)\s+ago$/i);
  if (/^just now$/i.test(handshake)) freshness = 'RECENT';
  else if (age) {
    const seconds = Number(age[1]) * (/^minute/i.test(age[2]) ? 60 : 1);
    freshness = seconds <= 180 ? 'RECENT' : 'STALE';
  }
  const connected = status === 'connected';
  const transport = connected && type === 'p2p' ? 'DIRECT_P2P'
    : connected && type === 'relayed' ? 'ENCRYPTED_RELAY_CANDIDATE' : 'UNKNOWN';
  return {
    peer_status: connected ? 'CONNECTED' : 'NOT_CONFIRMED',
    transport,
    handshake: connected ? freshness : 'NOT_CONFIRMED',
    reason: connected && freshness === 'RECENT' && transport !== 'UNKNOWN'
      ? 'LOCAL_STATUS_AND_RECENT_HANDSHAKE_OBSERVED'
      : 'NO_CORRELATED_RECENT_PEER_HANDSHAKE',
  };
}

export function observePeer(peerIp, {
  run = spawnSync,
  now = () => new Date().toISOString(),
} = {}) {
  const base = {
    schema: 'neo.multicloud.004.local-peer-observation.v1',
    source: 'LOCAL_LINUX_NETBIRD_READ_ONLY',
    observed_at: now(),
    peer_status: 'NOT_CONFIRMED',
    transport: 'UNKNOWN',
    handshake: 'NOT_CONFIRMED',
    decision: 'HOLD_NO_RECENT_PEER_HANDSHAKE',
    private_application_request_verified: false,
    independent_reviewer_verified: false,
    netbird_private_route_verified: false,
    production_authorized: false,
  };
  if (!isNetBirdIPv4(peerIp)) return { ...base, reason:'INVALID_PRIVATE_PEER_ADDRESS' };
  let result;
  try {
    result = run('netbird', ['status','--detail','--filter-by-ips',peerIp], {
      encoding:'utf8', timeout:5000, shell:false, windowsHide:true, maxBuffer:131072,
    });
  } catch { return { ...base, reason:'NETBIRD_CLI_UNAVAILABLE' }; }
  if (result?.error || result?.status !== 0 || typeof result.stdout !== 'string') {
    return { ...base, reason:'NETBIRD_CLI_UNAVAILABLE' };
  }
  const observed = assessDetail(result.stdout,peerIp);
  return {
    ...base, ...observed,
    decision: observed.reason === 'LOCAL_STATUS_AND_RECENT_HANDSHAKE_OBSERVED'
      ? 'LOCAL_PEER_EVIDENCE_PRESENT_REVIEW_PRIVATE_REQUEST'
      : 'HOLD_NO_RECENT_PEER_HANDSHAKE',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const idx=process.argv.indexOf('--peer-ip');
  const report=observePeer(idx < 0 ? null : process.argv[idx+1]);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if (report.decision.startsWith('HOLD_')) process.exitCode=2;
}
