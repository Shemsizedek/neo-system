import test from 'node:test';
import assert from 'node:assert/strict';
import { createDealDeskReplyWorker } from './reply-worker.mjs';

test('reply worker matches In-Reply-To to a sent outbox item and marks message seen',async()=>{
  const seen=[];
  const outbox={list:async()=>[{id:'wave1:1',status:'sent',delivery:{messageId:'<neo-1@holytemples.org>'}}]};
  const outboundService={recordReply:async(id,{text})=>({id,status:'replied',reply:{classification:/interested/i.test(text)?'positive_interest':'unknown'}})};
  const inboundReader={provider:'titan',ready:()=>true,pollUnread:async()=>[{uid:'44',inReplyTo:'<neo-1@holytemples.org>',references:'',from:'A <a@example.org>',subject:'Re: NEO',text:'Interested in a call.'}],markSeen:async uid=>seen.push(uid)};
  const worker=createDealDeskReplyWorker({outbox,outboundService,inboundReader});
  const result=await worker.run();
  assert.equal(result.matched,1);
  assert.equal(result.results[0].classification,'positive_interest');
  assert.deepEqual(seen,['44']);
});

test('reply worker leaves unmatched mail untouched for review',async()=>{
  const outbox={list:async()=>[]};
  const outboundService={recordReply:async()=>{throw new Error('should_not_run')}};
  const inboundReader={provider:'titan',ready:()=>true,pollUnread:async()=>[{uid:'45',inReplyTo:'<other@example.org>',references:'',from:'x@example.org',subject:'Hello',text:'Hi'}],markSeen:async()=>{throw new Error('should_not_mark')}};
  const result=await createDealDeskReplyWorker({outbox,outboundService,inboundReader}).run();
  assert.equal(result.unmatched,1);
});
