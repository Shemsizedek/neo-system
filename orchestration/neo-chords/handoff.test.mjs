import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCEPT_ORDER_LUA, createRedisChordsHandoffStore, createChordsGateHandoff } from './handoff.mjs';

// Simulation of Redis' atomic script semantics, not a live Upstash/Lua test.
function fakeRedis({ activeGate = { id:'gate-2',revision:4,next:{id:'gate-3',approvalClass:'A'} } } = {}) {
  const kv = new Map(), pending = [], calls = [];
  if (activeGate) kv.set('neo:chords:v1:active-gate',JSON.stringify(activeGate));
  const fetchImpl = async (url, init) => {
    const cmd=JSON.parse(init.body); calls.push({cmd,headers:init.headers,url});
    let result;
    if(cmd[0]==='GET') result=kv.get(cmd[1])||null;
    else if(cmd[0]==='EVAL') {
      const [,script,count,...rest]=cmd;
      assert.equal(script,ACCEPT_ORDER_LUA);assert.equal(count,4);
      const [active,receiptKey,queueKey,revKey,gateId,revision,verb,nextId,receiptJSON]=rest;
      const already=kv.get(receiptKey);
      if(already) result=['DUPLICATE',already];
      else {
        const gateJSON=kv.get(active),gate=gateJSON&&JSON.parse(gateJSON);
        if(!gate) result=['NOT_CONFIGURED',''];
        else if(gate.id!==gateId||gate.revision!==Number(revision)) result=['STALE_GATE',''];
        else if(gate.closed) result=['CLOSED_GATE',''];
        else if(verb==='NEXT_GATE'&&gate.next?.id!==nextId) result=['MISSING_NEXT_GATE',''];
        else if(verb==='NEXT_GATE'&&kv.has(revKey)) result=['GATE_REVISION_ALREADY_ORDERED',kv.get(revKey)];
        else {
          const receipt=JSON.parse(receiptJSON);
          receipt.status=verb==='NEXT_GATE'?(gate.next?.approvalClass==='A'?'QUEUED_FOR_AUTHORIZED_RUN':'AWAITING_APPROVAL'):'RECORDED';
          const packed=JSON.stringify(receipt);kv.set(receiptKey,packed);
          if(verb==='NEXT_GATE') kv.set(revKey,receipt.orderId);
          if(receipt.status==='QUEUED_FOR_AUTHORIZED_RUN')pending.push({queueKey,id:receipt.orderId});
          result=['RECORDED',packed];
        }
      }
    }else throw Error('unexpected command');
    return {ok:true,json:async()=>({result})};
  };
  return {fetchImpl,kv,pending,calls};
}
const auth={subjectId:'operator-1',verified:true,scopes:['chords.gate.propose']};
function build(opts={}) {
  const redis=fakeRedis(opts);
  const store=createRedisChordsHandoffStore({url:'https://redis.test',token:'redacted-test',fetchImpl:redis.fetchImpl});
  const service=createChordsGateHandoff({store,resolvePrincipal:async ctx=>ctx?.valid?auth:null});
  return {redis,store,service};
}
const submit=(service,overrides={})=>service.submit({utterance:'Next gate',expectedRevision:4,authContext:{valid:true},...overrides});

test('requires authenticated operator scope',async()=>{
  const {service}=build();
  await assert.rejects(submit(service,{authContext:{valid:false}}),/verified_operator_scope_required/);
});
test('deduplicates order on recreated handoff',async()=>{
  const {store,service,redis}=build();
  const first=await submit(service);
  const restarted=createChordsGateHandoff({store,resolvePrincipal:async()=>auth});
  const second=await submit(restarted);
  assert.equal(first.status,'QUEUED_FOR_AUTHORIZED_RUN');
  assert.equal(first.newlyQueued,true);
  assert.equal(second.status,'DUPLICATE');
  assert.equal(second.newlyQueued,false);
  assert.equal(redis.pending.length,1);
});
test('different voice order cannot queue same gate revision twice',async()=>{
  const {service,redis}=build();
  await submit(service);
  const other=await submit(service,{utterance:'Proceeding. Next gate.'});
  assert.equal(other.status,'BLOCKED');
  assert.equal(other.reason,'GATE_REVISION_ALREADY_ORDERED');
  assert.equal(redis.pending.length,1);
});
test('stale, undefined and unrecognized orders fail closed',async()=>{
  const {service}=build();
  await assert.rejects(submit(service,{expectedRevision:3}),/stale_gate_revision/);
  assert.equal((await submit(service,{utterance:'Please explain next gate'})).status,'UNRECOGNIZED');
  assert.equal((await submit(build({activeGate:{id:'gate-2',revision:4}}).service)).status,'BLOCKED');
});
test('non-A approval class is held without execution',async()=>{
  const {service,redis}=build({activeGate:{id:'gate-2',revision:4,next:{id:'funds',approvalClass:'D'}}});
  assert.equal((await submit(service)).status,'AWAITING_APPROVAL');
  assert.equal(redis.pending.length,0);
});
test('unknown persistent gate state is blocked',async()=>{
  const {service}=build({activeGate:null});
  assert.equal((await submit(service)).reason,'active_gate_not_configured');
});
test('atomic Redis command uses four scoped keys and does not serialize credential',async()=>{
  const {service,redis}=build();
  await submit(service);
  const call=redis.calls.find(x=>x.cmd[0]==='EVAL');
  assert.equal(call.cmd[2],4);
  assert.ok(call.cmd[6].includes('revision:gate-2:4'));
  assert.equal(JSON.stringify(call.cmd).includes('redacted-test'),false);
  assert.equal(call.headers.Authorization,'Bearer redacted-test');
});
test('rejects unvalidated proposals and missing Redis credentials',async()=>{
  assert.throws(()=>createRedisChordsHandoffStore({}),/chords_redis_credentials_required/);
  await assert.rejects(build().store.submit({executes:true,status:'PROPOSED'}),/validated_proposal_required/);
});
