import assert from 'node:assert/strict';
import test from 'node:test';
import { createStagingServer } from './server.mjs';

test('Render staging serves landing and health while denying privileged routes',async()=>{
  const server=createStagingServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    const health=await fetch(base+'/healthz');
    assert.equal(health.status,200);
    assert.equal((await health.json()).mode,'read-only');
    const home=await fetch(base+'/');
    assert.equal(home.status,200);
    assert.match(await home.text(),/https:\/\/noogle.holytemples.org\//);
    for(const path of ['/connect','/connect/session','/connect/terminal','/api/guardian/session']){
      const r=await fetch(base+path,{headers:{authorization:'Bearer forged','x-neopass-user':'admin'}});
      assert.equal(r.status,403);
      assert.equal((await r.json()).remote_terminal,false);
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('curated public search does not expose production data or bypass device denial',async()=>{
  const server=createStagingServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    const response=await fetch(base+'/search?q=ministry');
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.liveIndex,false);
    assert.equal(data.mode,'curated-public-preview');
    assert.ok(data.results.some(row=>row.title==='World Education'));
    assert.equal((await fetch(base+'/api/noogle/search?q=ministry')).status,403);
    assert.equal((await fetch(base+'/connect/terminal')).status,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('staging homepage serves an accessible responsive search interface',async()=>{
 const server=createStagingServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
 const base='http://127.0.0.1:'+server.address().port;
 const page=await fetch(base+'/');const html=await page.text();
 assert.equal(page.status,200);
 assert.match(html,/role="search"/);assert.match(html,/aria-live="polite"/);
 assert.match(html,/encodeURIComponent/);assert.match(html,/createElement/);
 assert.doesNotMatch(html,/innerHTML/);
 assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);
 const search=await fetch(base+'/search?q=ministry');assert.equal(search.status,200);
 assert.equal((await search.json()).count,2);
 assert.equal((await fetch(base+'/connect/terminal')).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
