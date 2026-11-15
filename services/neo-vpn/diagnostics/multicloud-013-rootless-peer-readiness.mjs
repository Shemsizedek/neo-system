#!/usr/bin/env node
// NEO-MULTICLOUD-013: read-only container/peer observation in the operator's
// Codespace. Never logs Docker env, credentials, peer IPs or raw NetBird status.
// No enrollment, network changes, ports, firewall, cloud calls or Docker exec writes.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {assessDetail, isNetBirdIPv4} from './multicloud-004-peer-observe.mjs';

const NAME='neo-cs-netbird-pilot';
const INSPECT_FORMAT=[
  '{{.State.Running}}',
  '{{.Config.Image}}',
  '{{.Config.User}}',
  '{{.HostConfig.Privileged}}',
  '{{.HostConfig.NetworkMode}}',
  '{{json .HostConfig.PortBindings}}',
  '{{json .HostConfig.CapAdd}}',
].join('|');

function call(run,args,timeout=5000,maxBuffer=131072) {
  try {
    const r=run('docker',args,{
      encoding:'utf8', timeout, maxBuffer, windowsHide:true, shell:false,
    });
    if (r?.error || r?.status!==0 || typeof r?.stdout!=='string') return null;
    return r.stdout;
  } catch {return null;}
}

export function validateContainerLine(raw) {
  if(typeof raw!=='string' || raw.length>4096) return 'HOLD_CONTAINER_NOT_CONFIRMED';
  const fields=raw.trim().split('|');
  if(fields.length!==7) return 'HOLD_CONTAINER_METADATA_UNAVAILABLE';
  const [running,image,user,privileged,network,ports,caps]=fields;
  if(running!=='true') return 'HOLD_CONTAINER_NOT_RUNNING';
  if(image!=='netbirdio/netbird:rootless-latest' || !user || ['root','0'].includes(user))
    return 'HOLD_UNEXPECTED_ROOTLESS_IDENTITY';
  if(privileged!=='false' || !['bridge','default'].includes(network) ||
     !['null','{}'].includes(ports) || !['null','[]'].includes(caps))
    return 'HOLD_CONTAINER_PRIVILEGE_OR_PUBLIC_PORT';
  return 'ISOLATED_ROOTLESS_CONTAINER';
}

export function inspectLocalPeer(peerIp, {
  run=spawnSync, env=process.env, now=()=>new Date().toISOString(),
}={}) {
  const base={
    schema:'neo.multicloud.013.codespace-rootless-peer.v1',
    source:'LOCAL_CODESPACE_OPERATOR_READ_ONLY',
    observed_at:now(),
    container:'NOT_CONFIRMED',
    daemon:'NOT_CONFIRMED',
    peer:'NOT_CONFIRMED',
    transport:'UNKNOWN',
    handshake:'NOT_CONFIRMED',
    decision:'HOLD',
    real_android_request_observed:false,
    reviewer_independently_verified:false,
    private_resource_route_verified:false,
    default_deny_access_verified:false,
    production_authorized:false,
  };
  if(env.CODESPACES!=='true' || env.CI==='true' || env.GITHUB_ACTIONS==='true')
    return {...base,decision:'HOLD_UNAUTHORIZED_COMPUTE_CONTEXT'};
  if(!isNetBirdIPv4(peerIp))
    return {...base,decision:'HOLD_INVALID_OR_UNSET_PEER'};
  const inspection=call(run,['container','inspect','--format',INSPECT_FORMAT,NAME]);
  if(inspection===null) return {...base,decision:'HOLD_NO_ROOTLESS_PILOT_CONTAINER'};
  const container=validateContainerLine(inspection);
  if(container!=='ISOLATED_ROOTLESS_CONTAINER')return {...base,decision:container};
  const checked={...base,container:'ISOLATED_ROOTLESS_CONTAINER'};
  const ready=call(run,['exec',NAME,'netbird','status','--check','ready']);
  if(ready===null)return {...checked,decision:'HOLD_NETBIRD_DAEMON_NOT_READY'};
  checked.daemon='LOCAL_READY_CHECK_PASSED';
  const detail=call(run,['exec',NAME,'netbird','status','--detail','--filter-by-ips',peerIp]);
  if(detail===null)return {...checked,decision:'HOLD_PEER_STATUS_UNAVAILABLE'};
  const peer=assessDetail(detail,peerIp);
  const recent=peer.reason==='LOCAL_STATUS_AND_RECENT_HANDSHAKE_OBSERVED';
  return {
    ...checked,
    peer:peer.peer_status,
    transport:peer.transport,
    handshake:peer.handshake,
    decision:recent?'LOCAL_RECENT_PEER_HANDSHAKE_APP_TEST_REQUIRED':
      'HOLD_EXACT_PEER_HANDSHAKE_UNCONFIRMED',
  };
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const i=process.argv.indexOf('--android-peer-ip');
  const report=inspectLocalPeer(i<0?null:process.argv[i+1]);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.decision.startsWith('HOLD_')) process.exitCode=2;
}
