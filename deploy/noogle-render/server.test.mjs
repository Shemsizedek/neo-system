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
    assert.match(await home.text(),/Noogle Connect — Device Hub/);
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

test('staging homepage focuses on device connection with no fake pairing',async()=>{
 const server=createStagingServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base='http://127.0.0.1:'+server.address().port;
 const page=await fetch(base+'/');const html=await page.text();
 assert.equal(page.status,200);assert.match(html,/Connect your/);assert.match(html,/Android phone/);assert.match(html,/Chromebook/);
 assert.match(html,/Check this device/);assert.match(html,/PublicKeyCredential/);assert.match(html,/aria-live="polite"/);
 assert.doesNotMatch(html,/id="search-form"/);assert.doesNotMatch(html,/innerHTML/);
 assert.equal((await fetch(base+'/connect/session')).status,403);
 assert.equal((await fetch(base+'/connect/terminal')).status,403);
 assert.equal((await fetch(base+'/search?q=ministry')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('two-browser preview requires explicit approval and never enrolls a device',async()=>{
 const server=createStagingServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
 const base='http://127.0.0.1:'+server.address().port;
 const home=await (await fetch(base+'/')).text();
 assert.match(home,/Create pairing code/);assert.match(home,/Request approval/);assert.match(home,/No devices are enrolled/);
 const call=async(action,data)=>fetch(base+'/preview/pair/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
 const created=await (await call('create',{})).json();
 assert.equal((await call('approve',{id:created.id,owner:created.owner})).status,403);
 const joined=await (await call('join',{id:created.id,code:created.code})).json();
 const before=await (await call('status',{id:created.id,credential:joined.joiner})).json();
 assert.equal(before.state,'awaiting_approval');
 const approved=await (await call('approve',{id:created.id,owner:created.owner})).json();
 assert.equal(approved.state,'approved_preview');assert.deepEqual(approved.permissions,[]);
 assert.equal(approved.remoteTerminal,false);assert.equal(approved.deviceEnrolled,false);
 assert.equal((await fetch(base+'/connect/session')).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('preview pairing accepts only staging and Connect domain browser origins',async()=>{
 const server=createStagingServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
 const url='http://127.0.0.1:'+server.address().port+'/preview/pair/create';
 const attempt=origin=>fetch(url,{method:'POST',headers:{'content-type':'application/json',origin},body:'{}'});
 const domain=await attempt('https://connect.holytemples.org');assert.equal(domain.status,201);
 const staging=await attempt('https://noogle-connect-staging.onrender.com');assert.equal(staging.status,201);
 const hostile=await attempt('https://attacker.example');assert.equal(hostile.status,403);
 assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/connect/terminal')).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('one tap device hub never grants remote terminal privilege',async()=>{
 const server=createStagingServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {const base='http://127.0.0.1:'+server.address().port;
 const page=await (await fetch(base+'/')).text();
 assert.match(page,/id="one-tap-connect"/);
 assert.match(page,/requires NEO Pass and the companion agent/);
 assert.equal((await fetch(base+'/connect/terminal')).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('live UI automatically checks pairing progress and reports NEO Mask passkey readiness',async()=>{
 const server=createStagingServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base='http://127.0.0.1:'+server.address().port;
 const html=await (await fetch(base+'/')).text();
 assert.match(html,/id="neomask-check"/);
 assert.match(html,/isUserVerifyingPlatformAuthenticatorAvailable/);
 assert.match(html,/setInterval\(\(\)=>\{if\(!document.hidden\)refreshPairState\(\);\},3000\)/);
 assert.match(html,/Bitcoin anchoring is a future audit feature/);
 assert.equal((await fetch(base+'/connect/terminal')).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('live shell reflects available browser pairing and avoids false terminal claims',async()=>{
 const server=createStagingServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
 const base='http://127.0.0.1:'+server.address().port;
 const html=await (await fetch(base+'/')).text();
 assert.match(html,/Browser-to-browser signals/);
 assert.match(html,/id="neopass-entry"/);
 assert.match(html,/href="https:\/\/neopass.holytemples.org\/"/);
 assert.match(html,/Browser pairing is live today/);
 assert.equal((await fetch(base+'/connect/terminal')).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('Chromebook PWA is installable without exposing protected Noogle routes',async()=>{
 const server=createStagingServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const base='http://127.0.0.1:'+server.address().port;
  const manifest=await fetch(base+'/manifest.webmanifest');assert.equal(manifest.status,200);
  assert.match(manifest.headers.get('content-type'),/application\/manifest\+json/);
  const config=await manifest.json();assert.equal(config.display,'standalone');assert.equal(config.start_url,'/');
  const icon=await fetch(base+'/noogle-icon.svg');assert.equal(icon.status,200);
  const home=await (await fetch(base+'/')).text();assert.match(home,/rel="manifest"/);
  assert.equal((await fetch(base+'/connect/session')).status,403);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
