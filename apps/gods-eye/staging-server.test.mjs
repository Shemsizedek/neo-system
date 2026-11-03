import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stagingServer} from './staging-server.mjs';
async function withServer(options,run){const s=stagingServer(options);await new Promise(r=>s.listen(0,'127.0.0.1',r));try{await run(`http://127.0.0.1:${s.address().port}`);}finally{await new Promise(r=>s.close(r));}}
test('staging disabled by default; fixed routes and methods only',async()=>withServer({},async base=>{
 assert.equal((await fetch(base+'/gods-eye/api/earthquakes')).status,503);
 assert.equal((await fetch(base+'/gods-eye/')).status,200);
 assert.equal((await fetch(base+'/gods-eye/api/earthquakes?url=http://localhost')).status,404);
 assert.equal((await fetch(base+'/gods-eye/api/earthquakes',{method:'POST'})).status,405);
}));
test('concurrent readers share one cached provider request, then expire',async()=>{
 let calls=0,now=0;
 await withServer({enabled:true,clock:()=>now,fetchSnapshot:async()=>{calls++;return {state:'empty',observations:[],records:[]};}},async base=>{
  await Promise.all(Array.from({length:8},()=>fetch(base+'/gods-eye/api/earthquakes')));assert.equal(calls,1);
  now=60001;await fetch(base+'/gods-eye/api/earthquakes');assert.equal(calls,2);
 });
});
test('provider errors return unavailable without leaking details',async()=>withServer({enabled:true,fetchSnapshot:async()=>{throw Error('private detail');}},async base=>{
 const r=await fetch(base+'/gods-eye/api/earthquakes');assert.equal(r.status,502);assert.equal((await r.json()).state,'unavailable');
}));
