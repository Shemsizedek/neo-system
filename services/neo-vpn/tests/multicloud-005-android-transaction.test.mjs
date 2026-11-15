import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { isNetBirdPeerIPv4, parseArguments, requestPrivateProbe,
  observeTransaction, TARGET_PORT, TARGET_PATH }
  from '../diagnostics/multicloud-005-android-transaction.mjs';

const peer='100.87.50.21';
const fixture = JSON.stringify({
  gate:'NEO-MULTICLOUD-002',
  response:'PRIVATE_APPLICATION_RESPONSE',
  private_tunnel_verified:false,
  gateway_production_verified:false
})+'\n';

function mockRequest({status=200,body=fixture,fail=false}={}) {
  const called=[];
  const request=(opts,onResponse)=>{
    called.push(opts);
    const client=new EventEmitter();
    client.destroy=()=>{};
    client.end=()=>{
      if (fail){client.emit('error',new Error('offline'));return;}
      const response=new EventEmitter();
      response.statusCode=status;
      response.resume=()=>{};
      onResponse(response);
      if (status===200) {
        response.emit('data',Buffer.from(body));
        response.emit('end');
      }
    };
    return client;
  };
  return {request,called};
}

test('restricts destination strictly to NetBird CGNAT IPv4',()=>{
  for(const ip of ['100.64.0.1',peer,'100.127.255.254'])
    assert.equal(isNetBirdPeerIPv4(ip),true);
  for(const ip of [null,'','127.0.0.1','0.0.0.0','10.144.0.3',
    '100.63.1.1','100.128.0.1','100.87.050.21','192.168.1.1'])
    assert.equal(isNetBirdPeerIPv4(ip),false);
});

test('invalid command arguments never initiate any network request',async()=>{
  assert.throws(()=>parseArguments(['--peer-ip','8.8.8.8']),/INVALID_PRIVATE_PEER_ARGUMENTS/);
  assert.throws(()=>parseArguments(['--peer-ip',peer,'--phase','off']),/INVALID_PRIVATE_PEER_ARGUMENTS/);
  assert.deepEqual(parseArguments(['--peer-ip',peer]),{ip:peer,phase:'first_private_request'});
  assert.equal(await requestPrivateProbe('8.8.8.8',{request:()=>{throw Error('Should not run')}}),'INVALID_PEER');
});

test('one fixed private port and path, no SSRF redirect or arbitrary URL',async()=>{
  const {request,called}=mockRequest();
  assert.equal(await requestPrivateProbe(peer,{request}),'PRIVATE_APPLICATION_RESPONSE_OBSERVED');
  assert.equal(called.length,1);
  assert.equal(called[0].hostname,peer);
  assert.equal(called[0].port,TARGET_PORT);
  assert.equal(called[0].path,TARGET_PATH);
  assert.equal(called[0].method,'GET');
});

test('HTTP success never certifies encrypted transport or WAN failover',async()=>{
  const {request}=mockRequest();
  const r=await observeTransaction(peer,'cellular_backup',{
    request,now:()=> '2026-11-14T06:00:00.000Z'
  });
  assert.equal(r.private_http_result,'PRIVATE_APPLICATION_RESPONSE_OBSERVED');
  assert.equal(r.android_interface_independently_verified,false);
  assert.equal(r.wireguard_handshake_independently_verified,false);
  assert.equal(r.cellular_failover_verified,false);
  assert.equal(r.production_authorized,false);
  assert.equal(r.phase,'cellular_backup');
  assert.ok(!JSON.stringify(r).includes(peer));
});

test('unexpected HTTP code cannot be accepted, no redirects followed',async()=>{
  const {request,called}=mockRequest({status:302});
  assert.equal(await requestPrivateProbe(peer,{request}),'NOT_CONFIRMED');
  assert.equal(called.length,1);
});

test('unrelated JSON or overly large body fails closed',async()=>{
  const a=mockRequest({body:JSON.stringify({response:'PRIVATE_APPLICATION_RESPONSE'})});
  assert.equal(await requestPrivateProbe(peer,{request:a.request}),'INVALID_RESPONSE');
  const b=mockRequest({body:'X'.repeat(5000)});
  assert.equal(await requestPrivateProbe(peer,{request:b.request}),'INVALID_RESPONSE');
});

test('network errors do not become false private transaction success',async()=>{
  const {request}=mockRequest({fail:true});
  assert.equal(await requestPrivateProbe(peer,{request}),'NOT_CONFIRMED');
});

test('unapproved phase is refused without contacting any device',async()=>{
  const r=await observeTransaction(peer,'invented_phase',{request:()=>{throw Error('Should not run')}});
  assert.equal(r.phase,'INVALID_PHASE');
  assert.equal(r.production_authorized,false);
});
