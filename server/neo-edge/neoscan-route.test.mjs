import {test} from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {serveProductStatic} from './product-static.mjs';
test('NEO Scan host serves its application, Crown bridge, and read-only health',async t=>{
 const server=http.createServer(async(req,res)=>{await serveProductStatic(req,res,new URL(req.url,'http://local'),'scan.holytemples.org')});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}`;
 const home=await fetch(base+'/');assert.equal(home.status,200);assert.match(await home.text(),/NEOscan/);
 assert.equal((await fetch(base+'/health')).status,200);assert.equal((await fetch(base+'/',{method:'POST'})).status,405);assert.equal((await fetch(base+'/missing.js')).status,404);assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,404);
});
