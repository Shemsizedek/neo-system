import test from 'node:test';
import assert from 'node:assert/strict';
import { isNetBirdIPv4, assessDetail, observePeer }
  from '../diagnostics/multicloud-004-peer-observe.mjs';

const peer='100.119.201.225';
const detail = [
'Peers detail:',
' Peer:',
'  NetBird IP: '+peer,
'  Public key: VERY_SECRET_PEER_KEY',
'  Status: Connected',
'  -- detail --',
'  Connection type: P2P',
'  ICE candidate endpoints: 203.0.113.10:9000',
'  Last WireGuard handshake: 25 seconds ago',
' Peer:',
'  NetBird IP: 100.119.230.104',
'  Status: Disconnected',
'  Connection type: Relayed',
'  Last WireGuard handshake: -',
' OS: linux/amd64',
' Management: Connected',
' Peers count: 1/2 Connected',
].join('\n')+'\n';

test('only provider overlay addresses accepted and strict IPv4 parsing',()=>{
  for(const a of ['100.64.0.1',peer,'100.127.255.254']) assert.equal(isNetBirdIPv4(a),true);
  for(const a of [null,'','10.144.1.2','127.0.0.1','0.0.0.0','100.128.0.1','100.63.3.4','100.70.001.3'])
    assert.equal(isNetBirdIPv4(a),false);
});
test('read-only peer status with no raw output',()=>{
  const calls=[];
  const r=observePeer(peer,{run:(name,args,opts)=>{calls.push({name,args,opts});return {status:0,stdout:detail}},
    now:()=> '2026-11-14T05:16:00.000Z'});
  assert.equal(r.peer_status,'CONNECTED');
  assert.equal(r.handshake,'RECENT');
  assert.equal(r.transport,'DIRECT_P2P');
  assert.equal(r.decision,'LOCAL_PEER_EVIDENCE_PRESENT_REVIEW_PRIVATE_REQUEST');
  assert.deepEqual(calls.map(x=>x.args),[['status','--detail','--filter-by-ips',peer]]);
  assert.equal(calls[0].opts.shell,false);
  assert.ok(!JSON.stringify(r).includes(peer));
  assert.ok(!JSON.stringify(r).includes('VERY_SECRET_PEER_KEY'));
  assert.ok(!JSON.stringify(r).includes('203.0.113.10'));
  assert.equal(r.private_application_request_verified,false);
  assert.equal(r.production_authorized,false);
});
test('target exact match required and unrelated peer ignored',()=>{
  assert.equal(assessDetail(detail,'100.119.201.224').peer_status,'NOT_CONFIRMED');
});
test('overall management status cannot masquerade as peer',()=>{
  const s=['Peers detail:',' Peer:','  NetBird IP: '+peer,'  Status: Disconnected',
    '  Last WireGuard handshake: -',' Management: Connected'].join('\n');
  assert.equal(assessDetail(s,peer).peer_status,'NOT_CONFIRMED');
  assert.equal(assessDetail(s,peer).handshake,'NOT_CONFIRMED');
});
test('stale handshake cannot qualify',()=>{
  const r=assessDetail(detail.replace('25 seconds ago','9 minutes ago'),peer);
  assert.equal(r.peer_status,'CONNECTED');
  assert.equal(r.handshake,'STALE');
  assert.equal(r.reason,'NO_CORRELATED_RECENT_PEER_HANDSHAKE');
});
test('fresh relayed is not direct',()=>{
  const r=assessDetail(detail.replace('Connection type: P2P','Connection type: Relayed'),peer);
  assert.equal(r.transport,'ENCRYPTED_RELAY_CANDIDATE');
  assert.equal(r.handshake,'RECENT');
});
test('no CLI, missing peer, invalid IP all hold',()=>{
  assert.equal(observePeer(peer,{run:()=>({error:{code:'ENOENT'}})}).decision,'HOLD_NO_RECENT_PEER_HANDSHAKE');
  assert.equal(observePeer(peer,{run:()=>({status:0,stdout:'Peers count: 0/0 Connected'})}).decision,'HOLD_NO_RECENT_PEER_HANDSHAKE');
  assert.equal(observePeer('8.8.8.8',{run:()=>{throw Error('must not call');}}).reason,'INVALID_PRIVATE_PEER_ADDRESS');
});
test('another peer handshake never transfers to target',()=>{
  const raw=['Peers detail:',' Peer:','  NetBird IP: '+peer,'  Status: Connected',
    '  Connection type: P2P','  Last WireGuard handshake: -',
    ' Peer:','  NetBird IP: 100.119.230.104','  Status: Connected',
    '  Connection type: P2P','  Last WireGuard handshake: 20 seconds ago'].join('\n');
  assert.equal(assessDetail(raw,peer).handshake,'NOT_CONFIRMED');
});
test('unparsable time and unknown transport hold',()=>{
  const r=assessDetail(detail.replace('Connection type: P2P','Connection type: Unknown')
    .replace('25 seconds ago','some long time ago'),peer);
  assert.equal(r.transport,'UNKNOWN');
  assert.equal(r.handshake,'NOT_CONFIRMED');
});
