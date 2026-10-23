import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreservationServer} from './server.mjs';
async function withServer(fetchImpl,fn){
 const server=createPreservationServer(fetchImpl);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await fn('http://127.0.0.1:'+server.address().port);}finally{await new Promise(resolve=>server.close(resolve));}
}
test('public preservation retains navigation and strips visitor credentials',async()=>{
 await withServer(async(url,options)=>{
  assert.equal(url.protocol,'https:');assert.equal(url.search,'');
  assert.equal(options.headers.get('cookie'),null);assert.equal(options.headers.get('authorization'),null);
  assert.equal(options.headers.get('x-private-token'),null);
  return new Response('<html><body>Archive</body></html>',{headers:{'content-type':'text/html','set-cookie':'private=yes'}});
 },async base=>{
  const result=await fetch(base+'/?secret=never-forward',{headers:{cookie:'session=private',authorization:'Bearer private','x-private-token':'private'}});
  assert.equal(result.status,200);assert.equal(result.headers.get('set-cookie'),null);
  assert.match(await result.text(),/https:\/\/holytemples.org\/site-directory\//);
 });
});
test('unknown paths and writes never reach an archive origin',async()=>{
 await withServer(()=>{throw Error('must not call');},async base=>{
  assert.equal((await fetch(base+'/api/private')).status,404);
  assert.equal((await fetch(base+'/',{method:'POST',body:'private'})).status,405);
  assert.equal((await fetch(base+'/health')).status,200);
 });
});
test('upstream outage remains a failure and HEAD has no body',async()=>{
 await withServer(()=>{throw Error('offline');},async base=>{
  const result=await fetch(base+'/');assert.equal(result.status,503);assert.match(await result.text(),/Source archive temporarily unavailable/);
  const head=await fetch(base+'/',{method:'HEAD'});assert.equal(head.status,503);assert.equal(await head.text(),'');
 });
});
