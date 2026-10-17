import test from 'node:test';import assert from 'node:assert/strict';import {createPreviewServer} from './preview-server.mjs';
test('local preview serves UI but refuses authentication and transfer APIs',async()=>{
 const server=createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base='http://127.0.0.1:'+server.address().port;
 const ui=await fetch(base+'/');assert.equal(ui.status,200);assert.match(await ui.text(),/COUNTERPAY/);
 const health=await (await fetch(base+'/api/health')).json();assert.equal(health.signing,false);assert.equal(health.auth,'unavailable');
 const disabled=await fetch(base+'/api/auth/login');assert.equal(disabled.status,503);
 const write=await fetch(base+'/api/transfer',{method:'POST'});assert.equal(write.status,405);
 const forbidden=await fetch(base+'/README.md');assert.equal(forbidden.status,404);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
