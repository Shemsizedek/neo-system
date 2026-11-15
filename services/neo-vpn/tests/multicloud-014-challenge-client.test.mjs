import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {parseArgs,validateResponse,requestChallenge,observe}
  from '../diagnostics/multicloud-014-challenge-client.mjs';

const peer='100.87.23.44';
const challenge='0123456789abcdef0123456789abcdef';
const other='f'.repeat(32);
const reply=(nonce=challenge)=>JSON.stringify({
  gate:'NEO-MULTICLOUD-002',response:'PRIVATE_APPLICATION_RESPONSE',
  challenge:nonce,private_tunnel_verified:false,gateway_production_verified:false,
  private_ip:'LEAK_SENTINEL',public_key:'KEY_SENTINEL',
})+'\n';

function mockRequest({status=200,body=reply(),error=false}={}) {
  const calls=[];
  const request=(opts,handler)=>{
    calls.push(opts);
    const client=new EventEmitter();
    client.destroy=()=>{};
    client.end=()=>{
      if(error){client.emit('error',new Error('offline'));return;}
      const res=new EventEmitter();
      res.statusCode=status;
      res.resume=()=>{};
      handler(res);
      if(status===200){
        res.emit('data',Buffer.from(body));
        res.emit('end');
      }
    };
    return client;
  };
  return {request,calls};
}

test('requires strictly validated overlay IP and exactly 128-bit hex challenge',()=>{
  assert.deepEqual(parseArgs(['--peer-ip',peer,'--expected-challenge',challenge]),{ip:peer,challenge});
  for(const args of [
    ['--peer-ip','8.8.8.8','--expected-challenge',challenge],
    ['--peer-ip',peer,'--expected-challenge','0000'],
    ['--peer-ip',peer,'--expected-challenge','G'.repeat(32)],
    ['--peer-ip',peer],[],
  ]) assert.throws(()=>parseArgs(args),/INVALID_PRIVATE_TEST_ARGUMENTS/);
});
test('fixed private destination only, no redirects or arbitrary endpoints',async()=>{
  const s=mockRequest();
  const result=await requestChallenge(peer,challenge,{request:s.request});
  assert.equal(result,'CHALLENGE_CORRELATED_PRIVATE_HTTP_RESPONSE');
  assert.equal(s.calls.length,1);
  assert.deepEqual([s.calls[0].hostname,s.calls[0].port,s.calls[0].path,s.calls[0].method],
    [peer,18443,'/neo-private-probe','GET']);
  assert.equal(s.calls[0].timeout,8000);
});
test('refuses static legacy payload without challenge',()=>{
  const s=mockRequest({body:JSON.stringify({
    gate:'NEO-MULTICLOUD-002',response:'PRIVATE_APPLICATION_RESPONSE',
    private_tunnel_verified:false,gateway_production_verified:false
  })});
  assert.equal(await requestChallenge(peer,challenge,{request:s.request}),
    'CHALLENGE_OR_RESPONSE_MISMATCH');
});
test('rejects stale or wrong challenge even if the response marker matches',async()=>{
  const s=mockRequest({body:reply(other)});
  assert.equal(await requestChallenge(peer,challenge,{request:s.request}),
    'CHALLENGE_OR_RESPONSE_MISMATCH');
});
test('unexpected response cannot claim success even if it repeats challenge',()=>{
  assert.equal(validateResponse({gate:'WRONG',response:'PRIVATE_APPLICATION_RESPONSE',
    challenge,private_tunnel_verified:false,gateway_production_verified:false},challenge),
    'CHALLENGE_OR_RESPONSE_MISMATCH');
  assert.equal(validateResponse({gate:'NEO-MULTICLOUD-002',response:'PRIVATE_APPLICATION_RESPONSE',
    challenge,private_tunnel_verified:true,gateway_production_verified:false},challenge),
    'CHALLENGE_OR_RESPONSE_MISMATCH');
});
test('invalid target/challenge never contacts network',async()=>{
  for(const [ip,c] of [['8.8.8.8',challenge],[peer,'abc']])
    assert.equal(await requestChallenge(ip,c,{request:()=>{throw Error('must not run')}}),
      'HOLD_INVALID_TARGET_OR_CHALLENGE');
});
test('HTTP redirect is not followed',async()=>{
  const s=mockRequest({status:302});
  assert.equal(await requestChallenge(peer,challenge,{request:s.request}),'HOLD_NON_200_RESPONSE');
  assert.equal(s.calls.length,1);
});
test('oversized JSON or network failure cannot qualify',async()=>{
  const a=mockRequest({body:'X'.repeat(5000)});
  assert.equal(await requestChallenge(peer,challenge,{request:a.request}),'HOLD_OVERSIZED_RESPONSE');
  const b=mockRequest({error:true});
  assert.equal(await requestChallenge(peer,challenge,{request:b.request}),'HOLD_NETWORK_ERROR');
});
test('success remains operator-reported and never certifies WireGuard or policy isolation',async()=>{
  const s=mockRequest();
  const result=await observe(peer,challenge,{request:s.request,now:()=> '2026-11-15T10:00:00.000Z'});
  assert.equal(result.unique_current_test_response_correlated,true);
  assert.equal(result.exact_wireguard_peer_handshake_independently_verified,false);
  assert.equal(result.unauthorized_peer_denial_verified,false);
  assert.equal(result.default_all_to_all_policy_disabled_verified,false);
  assert.equal(result.production_authorized,false);
  const redacted=JSON.stringify(result);
  for(const secret of [peer,challenge,'LEAK_SENTINEL','KEY_SENTINEL'])
    assert.ok(!redacted.includes(secret),'output leaked raw value');
});
test('invalid response body or malformed JSON holds',async()=>{
  const a=mockRequest({body:'badjson'});
  assert.equal(await requestChallenge(peer,challenge,{request:a.request}),'HOLD_UNREADABLE_RESPONSE');
  assert.equal(validateResponse(null,challenge),'INVALID_RESPONSE');
  assert.equal(validateResponse(['not','an','object'],challenge),'INVALID_RESPONSE');
});
