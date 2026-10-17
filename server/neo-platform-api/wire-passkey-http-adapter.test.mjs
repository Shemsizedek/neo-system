import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createWirePasskeyHttpAdapter} from './wire-passkey-http-adapter.mjs';
function request({path='/api/wire/passkeys/registration/begin',method='POST',body='{}',contentType='application/json'}={}){
 const req=Readable.from([Buffer.from(body)]);req.url=path;req.method=method;req.headers={'content-type':contentType,origin:'https://wire.holytemples.org'};return req;
}
function response(){return {headersSent:false,writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true},end(body){this.body=JSON.parse(body)}}}
test('unrecognized route is not handled',async()=>{
 const res=response();assert.equal(await createWirePasskeyHttpAdapter({handler:async()=>({status:200,body:{}})})(request({path:'/other'}),res),false);
});
test('requires POST',async()=>{
 const res=response();await createWirePasskeyHttpAdapter({handler:async()=>({status:200,body:{}})})(request({method:'GET'}),res);assert.equal(res.status,405);
});
test('requires JSON content type',async()=>{
 const res=response();await createWirePasskeyHttpAdapter({handler:async()=>({status:200,body:{}})})(request({contentType:'text/plain'}),res);assert.equal(res.status,415);
});
test('rejects oversized body',async()=>{
 const res=response();await createWirePasskeyHttpAdapter({handler:async()=>({status:200,body:{}}),maxBytes:8})(request({body:JSON.stringify({large:'123456789'})}),res);assert.equal(res.status,413);
});
test('rejects nonobject JSON payload',async()=>{
 const res=response();await createWirePasskeyHttpAdapter({handler:async()=>({status:200,body:{}})})(request({body:'[]'}),res);assert.equal(res.status,400);
});
test('dispatches action and returns non-cacheable response without wildcard CORS',async()=>{
 const res=response();let received;
 const adapter=createWirePasskeyHttpAdapter({handler:async data=>{received=data;return {status:200,body:{ok:true}}}});
 assert.equal(await adapter(request({path:'/api/wire/passkeys/authentication/finish',body:'{"challenge":"x"}'}),res),true);
 assert.equal(received.action,'authentication.finish');assert.equal(received.payload.challenge,'x');
 assert.equal(res.status,200);assert.equal(res.headers['cache-control'],'no-store');assert.equal(res.headers['access-control-allow-origin'],undefined);
});
