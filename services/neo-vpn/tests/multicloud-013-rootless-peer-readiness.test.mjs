import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLocalPeer,validateContainerLine}
  from '../diagnostics/multicloud-013-rootless-peer-readiness.mjs';

const ip='100.87.5.8';
const good='true|netbirdio/netbird:rootless-latest|netbird:netbird|false|bridge|null|null\n';
const detail=['Peers detail:',' Peer:','  NetBird IP: '+ip,
  '  Public key: SECRET_KEY_MUST_NOT_LEAK',
  '  Status: Connected','  Connection type: P2P',
  '  Last WireGuard handshake: 14 seconds ago',
  '  Remote endpoint: 203.0.113.10:40000'].join('\n');
const env={CODESPACES:'true'};
function simulate({inspection=good,ready='',peer=detail}={}){
  const calls=[];
  const run=(bin,args,opts)=>{
    calls.push({bin,args,opts});
    const text=args.join(' ');
    if(args[0]==='container')return inspection===null?{status:1}: {status:0,stdout:inspection};
    if(text.includes('status --check ready'))return ready===null?{status:1}:{status:0,stdout:ready};
    if(text.includes('status --detail'))return peer===null?{status:1}:{status:0,stdout:peer};
    throw Error('Unexpected command');
  };
  return {run,calls};
}
const now=()=> '2026-11-14T22:30:00.000Z';

test('complete local status only qualifies peer observation, never app or production',()=>{
  const s=simulate(),r=inspectLocalPeer(ip,{run:s.run,env,now});
  assert.equal(r.container,'ISOLATED_ROOTLESS_CONTAINER');
  assert.equal(r.daemon,'LOCAL_READY_CHECK_PASSED');
  assert.equal(r.peer,'CONNECTED');
  assert.equal(r.transport,'DIRECT_P2P');
  assert.equal(r.handshake,'RECENT');
  assert.equal(r.decision,'LOCAL_RECENT_PEER_HANDSHAKE_APP_TEST_REQUIRED');
  assert.equal(r.real_android_request_observed,false);
  assert.equal(r.production_authorized,false);
  assert.equal(r.reviewer_independently_verified,false);
  assert.ok(!JSON.stringify(r).includes(ip));
  assert.ok(!JSON.stringify(r).includes('SECRET_KEY_MUST_NOT_LEAK'));
  assert.ok(!JSON.stringify(r).includes('203.0.113.10'));
  assert.equal(s.calls.length,3);
  assert.ok(s.calls.every(c=>c.bin==='docker' && c.opts.shell===false));
});
test('no Codespaces operator or CI never touches Docker',()=>{
  for(const bad of [{},{CI:'true',CODESPACES:'true'}, {GITHUB_ACTIONS:'true',CODESPACES:'true'}]){
    const r=inspectLocalPeer(ip,{env:bad,run:()=>{throw Error('must not run')},now});
    assert.equal(r.decision,'HOLD_UNAUTHORIZED_COMPUTE_CONTEXT');
  }
});
test('invalid addresses are refused without Docker calls',()=>{
  for(const bad of ['8.8.8.8','10.144.0.1',null,'100.87.001.3']){
    const r=inspectLocalPeer(bad,{env,run:()=>{throw Error('must not run')},now});
    assert.equal(r.decision,'HOLD_INVALID_OR_UNSET_PEER');
  }
});
test('container not started blocks before daemon/status commands',()=>{
  const s=simulate({inspection:null}),r=inspectLocalPeer(ip,{run:s.run,env,now});
  assert.equal(r.decision,'HOLD_NO_ROOTLESS_PILOT_CONTAINER');
  assert.equal(s.calls.length,1);
});
test('invalid Docker network boundaries block before daemon status',()=>{
  const variants=[
    ['true|netbirdio/netbird:rootless-latest|netbird:netbird|true|bridge|null|null','HOLD_CONTAINER_PRIVILEGE_OR_PUBLIC_PORT'],
    ['true|netbirdio/netbird:rootless-latest|netbird:netbird|false|host|null|null','HOLD_CONTAINER_PRIVILEGE_OR_PUBLIC_PORT'],
    ['true|netbirdio/netbird:rootless-latest|netbird:netbird|false|bridge|{"18443/tcp":[{"HostPort":"18443"}]}|null','HOLD_CONTAINER_PRIVILEGE_OR_PUBLIC_PORT'],
    ['true|netbirdio/netbird:rootless-latest|netbird:netbird|false|bridge|null|["NET_ADMIN"]','HOLD_CONTAINER_PRIVILEGE_OR_PUBLIC_PORT'],
    ['true|netbirdio/netbird:latest|netbird:netbird|false|bridge|null|null','HOLD_UNEXPECTED_ROOTLESS_IDENTITY'],
  ];
  for(const [line,decision] of variants){
    const s=simulate({inspection:line});
    assert.equal(inspectLocalPeer(ip,{run:s.run,env,now}).decision,decision);
    assert.equal(s.calls.length,1);
  }
});
test('container stopped and malformed container metadata hold',()=>{
  assert.equal(validateContainerLine('false|netbirdio/netbird:rootless-latest|netbird:netbird|false|bridge|null|null'),
    'HOLD_CONTAINER_NOT_RUNNING');
  assert.equal(validateContainerLine('sensitive unexpected output'),
    'HOLD_CONTAINER_METADATA_UNAVAILABLE');
  assert.equal(validateContainerLine('x'.repeat(5000)),
    'HOLD_CONTAINER_NOT_CONFIRMED');
});
test('daemon unhealthy blocks before detailed peer status',()=>{
  const s=simulate({ready:null}),r=inspectLocalPeer(ip,{run:s.run,env,now});
  assert.equal(r.decision,'HOLD_NETBIRD_DAEMON_NOT_READY');
  assert.equal(s.calls.length,2);
});
test('missing or disconnected exact peer cannot inherit another handshake',()=>{
  const s=simulate({peer:detail.replace('100.87.5.8','100.87.5.9')});
  const r=inspectLocalPeer(ip,{run:s.run,env,now});
  assert.equal(r.decision,'HOLD_EXACT_PEER_HANDSHAKE_UNCONFIRMED');
});
test('stale handshake cannot pass',()=>{
  const s=simulate({peer:detail.replace('14 seconds ago','18 minutes ago')});
  const r=inspectLocalPeer(ip,{run:s.run,env,now});
  assert.equal(r.handshake,'STALE');
  assert.equal(r.decision,'HOLD_EXACT_PEER_HANDSHAKE_UNCONFIRMED');
});
test('detail status failing holds without displaying stderr',()=>{
  const s=simulate({peer:null});
  const r=inspectLocalPeer(ip,{run:s.run,env,now});
  assert.equal(r.decision,'HOLD_PEER_STATUS_UNAVAILABLE');
  assert.ok(!JSON.stringify(r).includes(ip));
});
test('relayed encrypted peer is eligible only for app test, not direct routing',()=>{
  const s=simulate({peer:detail.replace('Connection type: P2P','Connection type: Relayed')});
  const r=inspectLocalPeer(ip,{run:s.run,env,now});
  assert.equal(r.transport,'ENCRYPTED_RELAY_CANDIDATE');
  assert.equal(r.decision,'LOCAL_RECENT_PEER_HANDSHAKE_APP_TEST_REQUIRED');
  assert.equal(r.private_resource_route_verified,false);
});
