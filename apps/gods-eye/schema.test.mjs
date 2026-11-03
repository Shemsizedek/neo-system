import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkRecord} from './validation/check-record.mjs';
import {normalizeSnapshot,toGasRecord} from './earthquakes.mjs';
const schema=JSON.parse(readFileSync(new URL('../../data/neo-gas/record-schema.json',import.meta.url)));
test('adapter record satisfies current NEO-GAS schema keywords; invalid status rejected',()=>{
 const now=1793700000000;
 const raw=JSON.stringify({type:'FeatureCollection',metadata:{generated:now},features:[{type:'Feature',id:'test001',geometry:{type:'Point',coordinates:[0,0,0]},properties:{mag:1,time:now}}]});
 const record=toGasRecord(normalizeSnapshot(raw,{now})[0]);checkRecord(record,schema);
 assert.throws(()=>checkRecord({...record,status:'LIVE'},schema));
});
