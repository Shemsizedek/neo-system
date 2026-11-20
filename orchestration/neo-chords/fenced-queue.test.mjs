import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIT_READ_LUA, CLAIM_READ_LUA, SETTLE_READ_LUA, RECOVER_READ_LUA, CANCEL_READ_LUA,
  createFencedReadQueue, createReadJobRunner
} from './fenced-queue.mjs';

const INITIAL = Date.parse('2026-11-12T12:00:00Z');
function redisFixture() {
  let now = INITIAL;
  const jobs = new Map(), queued = [], leases = new Map(), delayed = new Map(), dead = [], kv = new Map(), requests = [];
  const status = id => jobs.get(id);
  const apply = (script, keys, argv) => {
    if (script === ADMIT_READ_LUA) {
      const [id,raw] = argv;
      if (jobs.has(id)) return ['EXISTS', JSON.stringify(status(id))];
      jobs.set(id,JSON.parse(raw));queued.push(id);return ['QUEUED',raw];
    }
    if (script === CLAIM_READ_LUA) {
      if (kv.get(keys[2]) !== '1') return ['PAUSED',''];
      for(let i=0;i<32;i++) {
        const id=queued.shift(); if(!id)return ['EMPTY',''];
        const job=status(id);if(!job||job.status!=='QUEUED')continue;
        if(job.deadlineMs<=now){job.status='DEAD_LETTER';job.errorCode='DEADLINE_EXPIRED';dead.push(id);continue;}
        job.status='RUNNING';job.attempts++;job.generation++;job.leaseToken=argv[0];job.claimedBy=argv[1];job.leaseUntilMs=now+Number(argv[2]);leases.set(id,job.leaseUntilMs);
        return ['CLAIMED',JSON.stringify(job)];
      }
      return ['SCAN_LIMIT',''];
    }
    if(script===SETTLE_READ_LUA) {
      const [id,token,generation,action,evidence,provider]=argv;
      const job=status(id);if(!job)return ['NOT_FOUND',''];
      if(job.status!=='RUNNING'||job.leaseToken!==token||job.generation!==Number(generation))return ['STALE_CLAIM',''];
      if(job.leaseUntilMs<=now)return ['LEASE_EXPIRED',''];
      leases.delete(id);job.leaseToken=null;job.claimedBy=null;job.leaseUntilMs=null;
      if(action==='COMPLETE'){job.status='COMPLETED';job.resultDigest=evidence;job.provider=provider;}
      else {job.errorCode=evidence;if(job.attempts>=job.maxAttempts||job.deadlineMs<=now){job.status='DEAD_LETTER';dead.push(id);}else{job.status='RETRY_WAIT';delayed.set(id,now+Math.min(60000,1000*2**(job.attempts-1)));}}
      return [job.status,JSON.stringify(job)];
    }
    if(script===RECOVER_READ_LUA) {
      const batch=Number(argv[0]);let expired=0,released=0;
      for(const [id,expires] of [...leases].filter(([,t])=>t<=now).slice(0,batch)){
        leases.delete(id);const job=status(id);if(!job||job.status!=='RUNNING')continue;
        job.leaseToken=null;job.leaseUntilMs=null;job.claimedBy=null;job.errorCode='LEASE_EXPIRED';
        if(job.attempts>=job.maxAttempts||job.deadlineMs<=now){job.status='DEAD_LETTER';dead.push(id);}
        else {job.status='RETRY_WAIT';delayed.set(id,now+1000);}expired++;
      }
      for(const [id,ready] of [...delayed].filter(([,t])=>t<=now).slice(0,batch)){
        delayed.delete(id);const job=status(id);if(!job||job.status!=='RETRY_WAIT')continue;
        if(job.deadlineMs<=now){job.status='DEAD_LETTER';job.errorCode='DEADLINE_EXPIRED';dead.push(id);}
        else {job.status='QUEUED';queued.push(id);released++;}
      }
      return [expired,released];
    }
    if(script===CANCEL_READ_LUA){const [id]=argv;const job=status(id);if(!job)return ['NOT_FOUND',''];
      if(['COMPLETED','DEAD_LETTER','CANCELLED'].includes(job.status))return [job.status,JSON.stringify(job)];
      job.status='CANCELLED';job.leaseToken=null;job.leaseUntilMs=null;job.claimedBy=null;leases.delete(id);delayed.delete(id);return ['CANCELLED',JSON.stringify(job)];}
    throw Error('unexpected Lua script');
  };
  const fetchImpl = async (url,init) => {
    const cmd=JSON.parse(init.body);requests.push({url,headers:init.headers,cmd});
    let result;
    if(cmd[0]==='EVAL') {const size=Number(cmd[2]);result=apply(cmd[1],cmd.slice(3,3+size),cmd.slice(3+size));}
    else if(cmd[0]==='HGET')result=jobs.has(cmd[2])?JSON.stringify(status(cmd[2])):null;
    else if(cmd[0]==='GET')result=kv.get(cmd[1])??null;
    else throw Error('unexpected redis command '+cmd[0]);
    return {ok:true,async json(){return {result}}};
  };
  const queue=createFencedReadQueue({url:'https://redis.mock',token:'fixture-token',fetchImpl});
  return {queue,jobs,queued,leases,delayed,dead,requests,enable(){kv.set('neo:{chords}:v1:enabled','1')},disable(){kv.set('neo:{chords}:v1:enabled','0')},advance(ms){now+=ms},get now(){return now}};
}
const job = (id,changes={})=>({id,principal:'operator-1',kind:'read',dataClass:'public',capability:'development.repositories.list',deadlineMs:INITIAL+120000,maxAttempts:3,parameters:{},...changes});
const claim = queue => queue.claim({workerId:'agent-one',leaseMs:10000});

test('default-paused queue cannot claim a job',async()=>{
  const x=redisFixture();await x.queue.enqueue(job('a'));
  assert.equal((await claim(x.queue)).status,'PAUSED');assert.equal(x.queued.length,1);
  assert.equal((await x.queue.health()).enabled,false);
});
test('two workers racing cannot claim the same work',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('a'));
  const [a,b]=await Promise.all([x.queue.claim({workerId:'w1',leaseMs:10000}),x.queue.claim({workerId:'w2',leaseMs:10000})]);
  assert.equal([a.status,b.status].filter(s=>s==='CLAIMED').length,1);
  assert.equal(x.jobs.get('a').attempts,1);
});
test('duplicate ID is idempotent, changed content rejects',async()=>{
  const x=redisFixture();assert.equal((await x.queue.enqueue(job('same'))).status,'QUEUED');
  assert.equal((await x.queue.enqueue(job('same'))).status,'DUPLICATE');
  await assert.rejects(x.queue.enqueue(job('same',{capability:'development.issues.list'})),/collision/);
  assert.equal(x.queued.length,1);
});
test('token and generation protect settlement and store digest, not raw output',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('proof'));
  const r=await claim(x.queue);const bad={...r.claim,leaseToken:'spoof'};
  assert.equal((await x.queue.complete(bad,{resultDigest:'a'.repeat(64),provider:'composio'})).status,'STALE_CLAIM');
  assert.equal((await x.queue.complete(r.claim,{resultDigest:'b'.repeat(64),provider:'composio'})).status,'COMPLETED');
  assert.equal((await x.queue.complete(r.claim,{resultDigest:'b'.repeat(64),provider:'composio'})).status,'STALE_CLAIM');
  const st=await x.queue.status('proof');assert.equal(st.resultDigest,'b'.repeat(64));assert.equal(st.leaseToken,undefined);
});
test('failure backs off, retry is released, and new claim is fenced',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('retry'));
  const first=await claim(x.queue);assert.equal((await x.queue.fail(first.claim)).status,'RETRY_WAIT');
  assert.equal((await claim(x.queue)).status,'EMPTY');x.advance(1000);
  assert.deepEqual(await x.queue.recover(),{expired:0,released:1});
  const second=await claim(x.queue);assert.equal(second.task.attempts,2);assert.equal(second.task.generation,2);
  assert.equal((await x.queue.complete(first.claim,{resultDigest:'b'.repeat(64),provider:'mock'})).status,'STALE_CLAIM');
});
test('expired lease is recovered and old worker cannot commit',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('crashed'));
  const old=await claim(x.queue);x.advance(11000);
  assert.equal((await x.queue.complete(old.claim,{resultDigest:'a'.repeat(64),provider:'mock'})).status,'LEASE_EXPIRED');
  assert.deepEqual(await x.queue.recover(),{expired:1,released:0});x.advance(1000);
  assert.deepEqual(await x.queue.recover(),{expired:0,released:1});
  const next=await claim(x.queue);assert.notEqual(next.claim.leaseToken,old.claim.leaseToken);
  assert.equal((await x.queue.complete(old.claim,{resultDigest:'a'.repeat(64),provider:'mock'})).status,'STALE_CLAIM');
});
test('exhausted retries enter dead-letter with no further dispatch',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('dead',{maxAttempts:1}));
  const r=await claim(x.queue);assert.equal((await x.queue.fail(r.claim)).status,'DEAD_LETTER');
  assert.equal(x.dead.length,1);x.advance(10000);await x.queue.recover();assert.equal((await claim(x.queue)).status,'EMPTY');
});
test('deadline expiry enters dead-letter before claim',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('expired',{deadlineMs:INITIAL+1000}));
  x.advance(2000);assert.equal((await claim(x.queue)).status,'EMPTY');
  assert.equal((await x.queue.status('expired')).status,'DEAD_LETTER');
});
test('cancel queued and running tasks with stale completion rejected',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('queued'));
  assert.equal((await x.queue.cancel('queued')).status,'CANCELLED');
  assert.equal((await claim(x.queue)).status,'EMPTY');
  await x.queue.enqueue(job('running'));const r=await claim(x.queue);
  assert.equal((await x.queue.cancel('running')).status,'CANCELLED');
  assert.equal((await x.queue.complete(r.claim,{resultDigest:'a'.repeat(64),provider:'mock'})).status,'STALE_CLAIM');
});
test('rejects mutations, private payloads, unexpected fields and unbounded retry',async()=>{
  const x=redisFixture();
  for(const bad of [job('a',{kind:'publish'}),job('a',{dataClass:'internal'}),job('a',{parameters:{private:'secret'}}),job('a',{maxAttempts:100}),job('a',{prompt:'injected'}),job('a',{id:'../etc/passwd'})]) {
    await assert.rejects(x.queue.enqueue(bad));
  }
  assert.equal(x.queued.length,0);
});
test('worker runner executes only read-only adapter and commits digest',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('runner'));
  const readWorker={run:async arg=>({capability:arg.capability,provider:'mock',readOnly:true,data:{count:1}})};
  const runner=createReadJobRunner({queue:x.queue,readWorker,workerId:'test-worker',leaseMs:10000,timeoutMs:1000});
  assert.equal((await runner.runOnce()).status,'COMPLETED');
  assert.equal((await x.queue.status('runner')).status,'COMPLETED');
});
test('unverified worker output goes to retry instead of completion',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('bad-result'));
  const runner=createReadJobRunner({queue:x.queue,readWorker:{run:async()=>({readOnly:false})},workerId:'test-worker',leaseMs:10000,timeoutMs:1000});
  assert.equal((await runner.runOnce()).status,'RETRY_WAIT');
});
test('timed out read leaves lease open for fenced recovery (no forced cancellation)',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('slow'));
  const runner=createReadJobRunner({queue:x.queue,readWorker:{run:()=>new Promise(()=>{})},workerId:'test-worker',leaseMs:6000,timeoutMs:500});
  assert.equal((await runner.runOnce()).status,'TIMED_OUT_LEASE_OPEN');
  assert.equal((await x.queue.status('slow')).status,'RUNNING');x.advance(7000);
  assert.equal((await x.queue.recover()).expired,1);
});
test('uses atomic EVAL for transitions and never passes credential inside Redis command body',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('command'));
  const r=await claim(x.queue);await x.queue.fail(r.claim);await x.queue.recover();await x.queue.cancel('command');
  for(const req of x.requests)assert.equal(JSON.stringify(req.cmd).includes('fixture-token'),false);
  assert.ok(x.requests.filter(r=>r.cmd[0]==='EVAL').length>=4);
});
test('a timed-out unresolved provider call keeps its worker busy',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('slow-busy'));
  let release;
  const providerPending=new Promise(resolve=>{release=resolve});
  const runner=createReadJobRunner({queue:x.queue,readWorker:{run:()=>providerPending},workerId:'worker-one',leaseMs:6000,timeoutMs:500});
  assert.equal((await runner.runOnce()).status,'TIMED_OUT_LEASE_OPEN');
  assert.equal((await runner.runOnce()).status,'BUSY');
  release({capability:'development.repositories.list',readOnly:true,provider:'mock',data:{ok:true}});
  await new Promise(resolve=>setImmediate(resolve));
  // Previous claim remains open for fenced recovery, while runner may now accept work.
  assert.equal((await runner.runOnce()).status,'EMPTY');
});
test('pausing a queue blocks additional claims but does not lose existing receipts',async()=>{
  const x=redisFixture();x.enable();await x.queue.enqueue(job('first'));await x.queue.enqueue(job('second'));
  const first=await claim(x.queue);x.disable();
  assert.equal((await claim(x.queue)).status,'PAUSED');
  assert.equal((await x.queue.complete(first.claim,{resultDigest:'f'.repeat(64),provider:'mock'})).status,'COMPLETED');
  x.enable();assert.equal((await claim(x.queue)).task.id,'second');
});
test('end-to-end isolated queue -> existing command-router read adapter -> evidence',async()=>{
  const {createChordsReadWorker}=await import('./read-worker.mjs');
  const x=redisFixture();x.enable();await x.queue.enqueue(job('integrated'));
  let executed=0;
  const router={
    async capabilityStatus(subject,capability){assert.equal(subject,'operator-1');return {capability,classification:'read',health:'ready'}},
    async execute(subject,request){executed++;return {ok:true,capability:request.capability,provider:'composio',data:{items:[]}}}
  };
  const adapter=createChordsReadWorker({commandRouter:router,subject:'operator-1',allowedCapabilities:['development.repositories.list']});
  const worker=createReadJobRunner({queue:x.queue,readWorker:adapter,workerId:'isolated-worker',leaseMs:10000,timeoutMs:1000});
  assert.equal((await worker.runOnce()).status,'COMPLETED');
  assert.equal(executed,1);assert.equal((await x.queue.status('integrated')).provider,'composio');
});
