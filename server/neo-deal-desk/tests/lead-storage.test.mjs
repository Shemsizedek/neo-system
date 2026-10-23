import test from 'node:test';
import assert from 'node:assert/strict';
import {leadSchema,postgresLeadStore,operatorLeadView} from '../lead-storage.mjs';
test('durable unique key',()=>assert.match(leadSchema,/dedupe_key char\(64\) NOT NULL UNIQUE/));
test('parameterized database insert',async()=>{let params;const store=postgresLeadStore({query:async(q,p)=>{assert.match(q,/ON CONFLICT/);params=p;return {rows:[{id:'lead-id'}]};}});assert.equal((await store.insertIfAbsent('a'.repeat(64),{id:'lead-id'})).id,'lead-id');assert.equal(params[1],'a'.repeat(64));});
test('unverified operator is rejected',async()=>{let status;await operatorLeadView({}, {writeHead(s){status=s},end(){}},{identity:{verified:false,roles:['neo_sales_operator']}});assert.equal(status,403);});
test('verified operator receives metadata',async()=>{let status,body;await operatorLeadView({}, {writeHead(s){status=s},end(v){body=JSON.parse(v)}},{identity:{verified:true,roles:['neo_sales_operator']},store:{listMetadata:async()=>[{id:'123',status:'received_unqualified'}]}});assert.equal(status,200);assert.equal(body.leads.length,1);});
