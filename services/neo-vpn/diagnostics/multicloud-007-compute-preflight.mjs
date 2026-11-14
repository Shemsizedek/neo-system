#!/usr/bin/env node
// NEO-MULTICLOUD-007 — diagnostic only. No sudo, account access, VPN up,
// installation, device changes, network interfaces, Docker start, or secret reads.
// Reports only categories. Codespaces/CI/Codex environments are NOT certified gateways.
import { statSync, accessSync, constants, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function hasNetAdmin(raw) {
  if (typeof raw !== 'string') return false;
  const match = raw.match(/^CapEff:\s*([0-9a-fA-F]{1,16})\s*$/m);
  if (!match) return false;
  try { return (BigInt('0x' + match[1]) & (1n << 12n)) !== 0n; }
  catch { return false; }
}

export function discoverTun({stat=statSync, access=accessSync}={}) {
  try {
    const s=stat('/dev/net/tun');
    if (!s.isCharacterDevice()) return 'NOT_AVAILABLE';
    try { access('/dev/net/tun',constants.R_OK | constants.W_OK); return 'ACCESSIBLE'; }
    catch { return 'PRESENT_ACCESS_UNVERIFIED'; }
  } catch { return 'NOT_AVAILABLE'; }
}

export function safeCommand(binary, args, run=spawnSync) {
  try {
    const result=run(binary,args,{
      encoding:'utf8', timeout:4000, maxBuffer:65536,
      windowsHide:true, shell:false,
    });
    return result?.status===0 && !result?.error ? 'AVAILABLE' : 'UNAVAILABLE';
  } catch { return 'UNAVAILABLE'; }
}

export function assessCompute({
  env=process.env, platform=process.platform, run=spawnSync,
  stat=statSync, access=accessSync, read=readFileSync,
  now=()=>new Date().toISOString(),
}={}) {
  const isCodespace=env.CODESPACES==='true';
  const isCI=env.CI==='true' || env.GITHUB_ACTIONS==='true';
  const isLinux=platform==='linux';
  const localTun=isLinux ? discoverTun({stat,access}) : 'NOT_AVAILABLE';
  let cap=false;
  if (isLinux) {
    try {cap=hasNetAdmin(read('/proc/self/status','utf8'));} catch {}
  }
  const docker=isLinux ? safeCommand('docker',['info','--format','{{.ServerVersion}}'],run) : 'UNAVAILABLE';
  const netbird=isLinux ? safeCommand('netbird',['version'],run) : 'UNAVAILABLE';

  // A TUN device and effective NET_ADMIN are necessary conditions but do not
  // establish that the container/host can create and route a WireGuard interface.
  const kernelCandidate=isLinux && localTun==='ACCESSIBLE' && cap;
  const rootlessCandidate=isLinux && docker==='AVAILABLE';
  let decision='HOLD_NO_SUPPORTED_PEER_ENVIRONMENT_OBSERVED';
  if (isCI) decision='CI_RUNNER_NOT_A_DURABLE_GATEWAY';
  else if (kernelCandidate) decision='KERNEL_TUN_PILOT_CANDIDATE_NEEDS_MANUAL_NETBIRD_TEST';
  else if (rootlessCandidate) decision='ROOTLESS_DOCKER_PILOT_CANDIDATE_NEEDS_MANUAL_INBOUND_TEST';
  else if (netbird==='AVAILABLE') decision='NETBIRD_INSTALLED_BUT_TUN_SUPPORT_UNVERIFIED';

  return {
    schema:'neo.multicloud.007.compute-preflight.v1',
    source:'LOCAL_READ_ONLY_COMPUTE',
    observed_at:now(),
    codespaces_environment_detected:isCodespace,
    ci_runner_detected:isCI,
    linux_runtime_detected:isLinux,
    tun_device:localTun,
    process_cap_net_admin:cap,
    docker_daemon:docker,
    netbird_cli:netbird,
    decision,
    actual_netbird_peer_enrolled:false,
    actual_private_traffic_verified:false,
    rootless_inbound_service_verified:false,
    persistent_gateway_verified:false,
    last_mile_bandwidth_affected:false,
    production_authorized:false,
  };
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const result=assessCompute();
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if (result.decision.startsWith('HOLD_') || result.ci_runner_detected) process.exitCode=2;
  } catch {
    process.stdout.write('{"schema":"neo.multicloud.007.compute-preflight.v1","decision":"HOLD_DIAGNOSTIC_FAILURE"}\n');
    process.exitCode=2;
  }
}
