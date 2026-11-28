import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {processBitflowsRequest,createUpstashReceiptStore} from './bitflows-intake.mjs'
const secret='f'.repeat(40),now=1795644000000
const event={schema_version:'neo.bitflows.event.v1',event_id:'bf-test-1',occurred_at:new Date(now).toISOString(),source:'holytemples.org',event_type:'form.submission.received',subject:{type:'lead',external_id:'synthetic-123'},correlation_id:'gate003-test-1',data:{test_only:true}}
function makeStore(){const map=new Map();return {durable:true,async insertOnce(id,record){if(map.has(id))return {inserted:false,record:map.get(id)};map.set(id,record);return {inserted:true,record}}}}
function request(store,overrides={}){const rawBody=JSON.stringify(overrides.event??event),timestamp=String(overrides.timestamp??now),signature=`sha256=${createHmac('sha256',secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;return processBitflowsRequest({method:overrides.method??'POST',headers:{'x-neo-timestamp':timestamp,'x-neo-signature':overrides.signature??signature},rawBody:overrides.rawBody??rawBody,env:{NEO_BITFLOWS_ENABLED:overrides.enabled??'true',NEO_BITFLOWS_HMAC_SECRET:secret},store,now})}
test('disabled by default',async()=>assert.equal((await request(makeStore(),{enabled:'false'})).status,503))
test('accept once and return original receipt for duplicate',async()=>{const s=makeStore();const first=await request(s);const again=await request(s);assert.equal(first.status,202);assert.equal(again.status,200);assert.equal(again.body.duplicate,true);assert.deepEqual(first.body.receipt,again.body.receipt)})
test('same id with different body conflicts',async()=>{const s=makeStore();await request(s);assert.equal((await request(s,{event:{...event,subject:{type:'lead',external_id:'different'}}})).status,409)})
test('reject forged signature',async()=>assert.equal((await request(makeStore(),{signature:'sha256='+'0'.repeat(64)})).status,401))
test('reject expired request',async()=>assert.equal((await request(makeStore(),{timestamp:now-600000})).status,401))
test('reject invalid schema',async()=>assert.equal((await request(makeStore(),{event:{...event,source:'evil.example'}})).status,400))
test('reject live payload',async()=>assert.equal((await request(makeStore(),{event:{...event,data:{test_only:false}}})).status,403))
test('reject absent persistent store',async()=>assert.equal((await request({durable:false})).status,503))
test('fail closed on persistence failure',async()=>assert.equal((await request({durable:true,insertOnce:async()=>{throw Error('db down')}})).status,503))
test('reject large payload',async()=>assert.equal((await processBitflowsRequest({method:'POST',rawBody:'a'.repeat(16385),env:{NEO_BITFLOWS_ENABLED:'true',NEO_BITFLOWS_HMAC_SECRET:secret}})).status,413))
test('reject unsupported method',async()=>assert.equal((await processBitflowsRequest({method:'GET'})).status,405))
test('no Upstash config means no durable store',()=>assert.equal(createUpstashReceiptStore({}).durable,false))
