import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { evaluatePilotReadiness, failClosedPilotReport } from '../federation/netbird-pilot-audit.mjs';

const NOW='2026-11-09T14:00:00Z';
const peers=[
  {id:'peer-secret-aaa',name:'operator-a-private-laptop',ip:'100.64.1.5',
    connected:true,last_seen:'2026-11-09T13:59:30Z',
    user_id:'operator-a-id',approval_required:false,login_expired:false},
  {id:'peer-secret-bbb',name:'operator-b-private-laptop',ip:'100.64.1.6',
    connected:true,last_seen:'2026-11-09T13:59:45Z',
    user_id:'operator-b-id',approval_required:false,login_expired:false}
];
const restricted=[{name:'NEO pilot service HTTPS',enabled:true,
  rules:[{action:'accept',enabled:true,protocol:'tcp',ports:['443'],
    sources:['admin-approved'],destinations:['pilot-service']}]}];
const defaultPolicy=[{name:'Default',enabled:true,
  rules:[{name:'Default',action:'accept',enabled:true,bidirectional:true,protocol:'all'}]}];

test('zero peers does not produce fake handshake or live production state',()=>{
  const r=evaluatePilotReadiness({peers:[],policies:[],observedAt:NOW});
  assert.equal(r.registered_peer_count,0);
  assert.equal(r.live_wireguard_handshake_accepted,false);
  assert.equal(r.production_status,'HOLD_PENDING_DEVICE_AND_POLICY_ACCEPTANCE');
  assert.ok(r.flags.includes('TWO_RECENT_AUTHORIZED_CONNECTED_PEERS_NOT_OBSERVED'));
  assert.ok(r.flags.includes('NO_ACTIVE_ACCESS_POLICY_OBSERVED'));
});

test('two connected peers still cannot replace real handshake/ACL and revocation checks',()=>{
  const r=evaluatePilotReadiness({peers,policies:restricted,observedAt:NOW});
  assert.equal(r.recent_connected_approved_peer_count,2);
  assert.equal(r.distinct_user_id_count_for_recent_peers,2);
  assert.equal(r.potentially_broad_default_policy_enabled,false);
  assert.equal(r.two_device_production_acceptance,false);
  assert.equal(r.neo_private_network_routing_accepted,false);
  const rendered=JSON.stringify(r);
  for(const privateValue of ['peer-secret-aaa','peer-secret-bbb','operator-a-id',
    'operator-b-id','operator-a-private-laptop','100.64.1.5']) {
    assert.equal(rendered.includes(privateValue),false);
  }
});

test('default all-to-all onboarding policy is explicitly flagged even with two peers',()=>{
  const r=evaluatePilotReadiness({peers,policies:defaultPolicy,observedAt:NOW});
  assert.equal(r.potentially_broad_default_policy_enabled,true);
  assert.ok(r.flags.includes('POTENTIALLY_BROAD_DEFAULT_ACCESS_POLICY_ENABLED'));
  assert.equal(r.two_device_production_acceptance,false);
});

test('stale disconnected unapproved and expired sessions are excluded',()=>{
  const mutated=[
    {...peers[0],last_seen:'2026-11-08T12:00:00Z'},
    {...peers[1],approval_required:true},
    {...peers[0],id:'third',connected:false},
    {...peers[0],id:'fourth',login_expired:true}
  ];
  const r=evaluatePilotReadiness({peers:mutated,policies:restricted,observedAt:NOW});
  assert.equal(r.recent_connected_approved_peer_count,0);
});

test('duplicate peer or owner identity does not count as independent observation',()=>{
  const r=evaluatePilotReadiness({peers:[peers[0],{...peers[0]}],policies:restricted,observedAt:NOW});
  assert.equal(r.recent_connected_approved_peer_count,1);
  assert.equal(r.distinct_user_id_count_for_recent_peers,1);
});

test('missing or invalid API records fail closed',()=>{
  assert.throws(()=>evaluatePilotReadiness({peers:null,policies:[]}),/netbird_read_only_inventory_unavailable/);
  assert.throws(()=>evaluatePilotReadiness({peers:[],policies:{}}),/netbird_read_only_inventory_unavailable/);
  assert.throws(()=>evaluatePilotReadiness({peers:[],policies:[],observedAt:'never'}),/invalid_observation_time/);
  assert.equal(failClosedPilotReport().production_status,'HOLD_UNVERIFIED');
});

test('no PAT gives sanitized failure and makes no network calls',()=>{
  const path=new URL('../federation/netbird-cloud-observe.mjs',import.meta.url);
  const {NETBIRD_PAT, ...safeEnv}=process.env;
  const child=spawnSync(process.execPath,[path.pathname],{
    encoding:'utf8',env:safeEnv,timeout:10000
  });
  assert.equal(child.status,2,child.stderr);
  const result=JSON.parse(child.stdout);
  assert.equal(result.flags[0],'NETBIRD_PAT_NOT_CONFIGURED');
  assert.equal(result.inventory_authenticated,false);
});

test('observer source has GET-only official API endpoints and no credential output',()=>{
  const path=new URL('../federation/netbird-cloud-observe.mjs',import.meta.url);
  const source=readFileSync(path,'utf8');
  assert.match(source,/https:\/\/api\.netbird\.io/);
  assert.match(source,/listResource\('\/api\/peers'\)/);
  assert.match(source,/listResource\('\/api\/policies'\)/);
  assert.match(source,/method:'GET'/);
  assert.doesNotMatch(source,/method:'(POST|PUT|PATCH|DELETE)'/);
  assert.doesNotMatch(source,/process\.stdout\.write\(token\)/);
});
