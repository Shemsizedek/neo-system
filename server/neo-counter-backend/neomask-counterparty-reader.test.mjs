import test from 'node:test';import assert from 'node:assert/strict';import{createCounterpartyReader}from './neomask-counterparty-reader.mjs';
test('rejects unapproved endpoint',()=>assert.throws(()=>createCounterpartyReader({baseUrl:'https://evil.example/v2',allowHosts:['node.example']})));
test('requires tls',()=>assert.throws(()=>createCounterpartyReader({baseUrl:'http://node.example/v2',allowHosts:['node.example']})));
test('requires approved address',async()=>await assert.rejects(createCounterpartyReader({baseUrl:'https://node.example/v2',allowHosts:['node.example']}).balances('bad')));
test('returns explicitly unverified read',async()=>{const r=createCounterpartyReader({baseUrl:'https://node.example/v2',allowHosts:['node.example'],fetchImpl:async()=>({ok:true,json:async()=>({result:[]})})});const x=await r.balances('bc1q12345678901234567890');assert.equal(x.verified,false)});
test('rejects malformed provider response',async()=>{const r=createCounterpartyReader({baseUrl:'https://node.example/v2',allowHosts:['node.example'],fetchImpl:async()=>({ok:true,json:async()=>({hello:1})})});await assert.rejects(r.balances('bc1q12345678901234567890'))});
