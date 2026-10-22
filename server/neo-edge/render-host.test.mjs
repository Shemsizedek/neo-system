import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRenderHost} from './render-host.mjs';
test('Render default hostname maps to existing public NEO gateway',()=>{
 const request={headers:{host:'neo-edge-render.onrender.com','x-forwarded-host':'neo-edge-render.onrender.com'}};
 normalizeRenderHost(request,'neo-edge-render.onrender.com');
 assert.equal(request.headers.host,'neo.holytemples.org');
 assert.equal(request.headers['x-forwarded-host'],'neo.holytemples.org');
});
test('custom domains and unconfigured hosts keep their routing',()=>{
 for(const host of ['neopass.holytemples.org','treasury.holytemples.org','unknown.example','other.onrender.com']){
  const request={headers:{host}};normalizeRenderHost(request,'neo-edge-render.onrender.com');assert.equal(request.headers.host,host);
 }
 const request={headers:{host:'neo-edge-render.onrender.com'}};normalizeRenderHost(request,'');assert.equal(request.headers.host,'neo-edge-render.onrender.com');
});
