import {test} from 'node:test';
import assert from 'node:assert/strict';
import {probe} from './live-probe.mjs';
const time=1793700000000;
test('read-only probe reports an empty validated snapshot and rejects unavailability',async()=>{
 const result=await probe({now:()=>time,fetchSnapshot:async()=>({state:'live',generatedAt:new Date(time).toISOString(),fetchedAt:new Date(time).toISOString(),observations:[]})});
 assert.equal(result.eventCount,0);assert.equal(result.state,'live');assert.equal(result.snapshotSha256,null);
 await assert.rejects(()=>probe({fetchSnapshot:async()=>({state:'unavailable',observations:[]})}));
});
