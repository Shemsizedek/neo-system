import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRenderHost,migrationPreviewBlocks} from './render-host.mjs';
test('Render default hostname maps to existing public NEO gateway',()=>{
 const request={headers:{host:'neo-edge-render.onrender.com','x-forwarded-host':'neo-edge-render.onrender.com'}};
 normalizeRenderHost(request,'neo-edge-render.onrender.com');
 assert.equal(request.headers.host,'neo.holytemples.org');
 assert.equal(request.headers['x-forwarded-host'],'neo.holytemples.org');
});
test('migration preview blocks writes, APIs and protected workspaces',()=>{
 for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal(migrationPreviewBlocks({method,url:'/'},'neo.holytemples.org'),true);
 for(const host of ['neopass','neobank','wallet','treasury','court','desk','gateway','neodash'])assert.equal(migrationPreviewBlocks({method:'GET',url:'/'},host+'.holytemples.org'),true);
 assert.equal(migrationPreviewBlocks({method:'GET',url:'/api/treasury'},'neo.holytemples.org'),true);
 assert.equal(migrationPreviewBlocks({method:'GET',url:'/health'},'neo.holytemples.org'),false);
 assert.equal(migrationPreviewBlocks({method:'GET',url:'/'},'neo.holytemples.org'),false);
});
test('custom domains and unconfigured hosts keep their routing',()=>{
 for(const host of ['neopass.holytemples.org','treasury.holytemples.org','unknown.example','other.onrender.com']){
  const request={headers:{host}};normalizeRenderHost(request,'neo-edge-render.onrender.com');assert.equal(request.headers.host,host);
 }
 const request={headers:{host:'neo-edge-render.onrender.com'}};normalizeRenderHost(request,'');assert.equal(request.headers.host,'neo-edge-render.onrender.com');
});
