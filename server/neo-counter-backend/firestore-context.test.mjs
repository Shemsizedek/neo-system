import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createFirestoreContext, FirestoreVersionConflictError } from './firestore-context.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
function fakeDb(){
  const rows=new Map();
  const col=name=>({
    doc:id=>({
      _key:`${name}/${id}`,
      async get(){const v=rows.get(`${name}/${id}`);return {exists:v!==undefined,data:()=>v};},
      async set(v){rows.set(`${name}/${id}`,structuredClone(v));},
      async delete(){rows.delete(`${name}/${id}`);}
    }),
    where(field,op,value){return {orderBy(){return {limit(n){return {async get(){
      const docs=[...rows.entries()].filter(([k,v])=>k.startsWith(`${name}/`)&&v?.[field]===value).map(([,v])=>v).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,n).map(v=>({data:()=>structuredClone(v)}));
      return {docs};
    }}}}}};}
  });
  return {collection:col,async runTransaction(work){const tx={async get(ref){return ref.get();},set(ref,v){rows.set(ref._key,structuredClone(v));}};return work(tx);}};
}

const fixed=new Date('2026-09-09T21:30:00.000Z');
function context(){return createFirestoreContext({db:fakeDb(),now:()=>new Date(fixed),randomId:(()=>{let n=0;return()=>`event-${++n}`})(),randomToken:()=> 'token-1',terminals:[{id:'t1',merchantId:'m1',enabled:true,secretHash:hash('secret')}],staff:[{id:'s1',merchantId:'m1',active:true,pinHash:hash('1234'),permissions:['register','settings','reports']}]});}

test('atomic envelope update preserves optimistic concurrency',async()=>{
  const ctx=context();
  const first=await ctx.putEnvelope({merchantId:'m1',entity:'merchant_ops',terminalId:'t1',version:0,payload:{a:1}});
  assert.equal(first.version,1);
  await assert.rejects(()=>ctx.putEnvelope({merchantId:'m1',entity:'merchant_ops',terminalId:'t1',version:0,payload:{a:2}}),e=>e instanceof FirestoreVersionConflictError&&e.remote.version===1);
});

test('sessions authenticate with hashed bearer-token storage',async()=>{
  const ctx=context();
  const session=await ctx.createSession({merchantId:'m1',terminalId:'t1',terminalSecret:'secret',staffId:'s1',pin:'1234'});
  assert.equal(session.token,'token-1');
  const principal=await ctx.sessionPrincipal({headers:{authorization:'Bearer token-1'}});
  assert.equal(principal.staffId,'s1');
});

test('events use document id as idempotency key and list newest first',async()=>{
  const ctx=context();
  const a=await ctx.appendEvent({id:'same',merchantId:'m1',type:'sale',payload:{n:1},createdAt:'2026-09-09T20:00:00.000Z'});
  const b=await ctx.appendEvent({id:'same',merchantId:'m1',type:'sale',payload:{n:2},createdAt:'2026-09-09T20:01:00.000Z'});
  assert.deepEqual(b,a);
  await ctx.appendEvent({id:'new',merchantId:'m1',type:'sale',createdAt:'2026-09-09T20:02:00.000Z'});
  assert.deepEqual((await ctx.listEvents('m1')).map(x=>x.id),['new','same']);
});
