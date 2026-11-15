import test from 'node:test';
import assert from 'node:assert/strict';
import {hasNetAdmin,discoverTun,safeCommand,assessCompute}
  from '../diagnostics/multicloud-007-compute-preflight.mjs';

const caps = 'Name:\tnode\nCapEff:\t0000000000001000\n';
const noCaps = 'Name:\tnode\nCapEff:\t0000000000000000\n';
const tunStat = {isCharacterDevice:()=>true};
const dockerRun = (cmd,args,opts)=> {
  assert.equal(opts.shell,false);
  assert.equal(opts.timeout,4000);
  if (cmd==='docker') assert.deepEqual(args,['info','--format','{{.ServerVersion}}']);
  if (cmd==='netbird') assert.deepEqual(args,['version']);
  return {status:cmd==='docker'?0:1,stdout:'DO_NOT_ECHO_HOST_OR_KEY'};
};
const fixture=(overrides={})=>({
  env:{CODESPACES:'true'},
  platform:'linux',stat:()=>tunStat,access:()=>undefined,
  read:()=>caps,run:dockerRun,
  now:()=> '2026-11-14T06:10:00.000Z',...overrides
});
test('strictly parses CAP_NET_ADMIN bit, not merely any capability',()=>{
  assert.equal(hasNetAdmin(caps),true);
  assert.equal(hasNetAdmin(noCaps),false);
  assert.equal(hasNetAdmin('CapEff:\t0000000000002000'),false);
  assert.equal(hasNetAdmin('CapEff: NOT_HEX'),false);
});

test('a character TUN device can be present yet not usable',()=>{
  assert.equal(discoverTun({stat:()=>tunStat,access:()=>{throw Error('EACCES')}}),
    'PRESENT_ACCESS_UNVERIFIED');
  assert.equal(discoverTun({stat:()=>({isCharacterDevice:()=>false}),access:()=>{}}),
    'NOT_AVAILABLE');
  assert.equal(discoverTun({stat:()=>{throw Error('ENOENT')},access:()=>{}}),
    'NOT_AVAILABLE');
});

test('Codespaces with device and CAP_NET_ADMIN is still only a pilot candidate',()=>{
  const r=assessCompute(fixture());
  assert.equal(r.codespaces_environment_detected,true);
  assert.equal(r.decision,'KERNEL_TUN_PILOT_CANDIDATE_NEEDS_MANUAL_NETBIRD_TEST');
  assert.equal(r.actual_netbird_peer_enrolled,false);
  assert.equal(r.actual_private_traffic_verified,false);
  assert.equal(r.persistent_gateway_verified,false);
  assert.equal(r.production_authorized,false);
  assert.ok(!JSON.stringify(r).includes('DO_NOT_ECHO'));
});

test('Docker available but no TUN means rootless candidate, not connected peer',()=>{
  const r=assessCompute(fixture({read:()=>noCaps,stat:()=>{throw Error('ENOENT')}}));
  assert.equal(r.decision,'ROOTLESS_DOCKER_PILOT_CANDIDATE_NEEDS_MANUAL_INBOUND_TEST');
  assert.equal(r.docker_daemon,'AVAILABLE');
  assert.equal(r.rootless_inbound_service_verified,false);
  assert.equal(r.actual_netbird_peer_enrolled,false);
});

test('no Docker or TUN stays on HOLD and makes no changes',()=>{
  const r=assessCompute(fixture({stat:()=>{throw Error('ENOENT')},
    read:()=>noCaps,run:()=>({status:1})}));
  assert.equal(r.decision,'HOLD_NO_SUPPORTED_PEER_ENVIRONMENT_OBSERVED');
  assert.equal(r.docker_daemon,'UNAVAILABLE');
});

test('Codex Linux is a candidate only if actually checked, not automatically durable',()=>{
  const r=assessCompute(fixture({env:{},read:()=>noCaps}));
  assert.equal(r.codespaces_environment_detected,false);
  assert.equal(r.decision,'ROOTLESS_DOCKER_PILOT_CANDIDATE_NEEDS_MANUAL_INBOUND_TEST');
  assert.equal(r.persistent_gateway_verified,false);
});

test('CI runner is never accepted as a durable or production peer',()=>{
  const r=assessCompute(fixture({env:{CODESPACES:'true',CI:'true'}}));
  assert.equal(r.decision,'CI_RUNNER_NOT_A_DURABLE_GATEWAY');
  assert.equal(r.persistent_gateway_verified,false);
  assert.equal(r.actual_private_traffic_verified,false);
});

test('non-Linux cannot qualify for this Linux-specific diagnostic',()=>{
  const r=assessCompute(fixture({platform:'darwin',
    stat:()=>{throw Error('must not stat')},access:()=>{throw Error('must not access')},
    read:()=>{throw Error('must not read')},run:()=>{throw Error('must not run')}}));
  assert.equal(r.linux_runtime_detected,false);
  assert.equal(r.decision,'HOLD_NO_SUPPORTED_PEER_ENVIRONMENT_OBSERVED');
});

test('no process output, filesystem paths, hostnames, or supplied secrets escape',()=>{
  const r=assessCompute(fixture({env:{CODESPACES:'true',HOSTNAME:'PRIVATE_HOST',API_KEY:'PRIVATE_SECRET'}}));
  const output=JSON.stringify(r);
  for(const secret of ['PRIVATE_HOST','PRIVATE_SECRET','DO_NOT_ECHO','/dev/net/tun','/proc/self/status'])
    assert.ok(!output.includes(secret));
});

test('safe command fails closed on throw, failed status, and no numeric status',()=>{
  assert.equal(safeCommand('netbird',['version'],()=>{throw Error('err')}),'UNAVAILABLE');
  assert.equal(safeCommand('netbird',['version'],()=>({status:null})),'UNAVAILABLE');
  assert.equal(safeCommand('netbird',['version'],()=>({status:1})),'UNAVAILABLE');
  assert.equal(safeCommand('netbird',['version'],()=>({status:0})),'AVAILABLE');
});
