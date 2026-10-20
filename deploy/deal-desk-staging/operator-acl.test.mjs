import test from 'node:test';import assert from 'node:assert/strict';import {makeOperatorAcl,attachOperatorAcl} from './operator-acl.mjs';
const now=()=>Date.parse('2026-10-19T20:00:00Z');
function mock(grants){return {collection:()=>({where:()=>({limit:()=>({get:async()=>({empty:grants.length===0,docs:grants.map(g=>({data:()=>g}))})})})})}};
const good={subject:'google:test',permission:'neo_sales_operator',status:'active',approvedBy:'admin',expiresAt:'2026-11-01T00:00:00Z'};
test('authorized grant passes',async()=>assert.equal(await makeOperatorAcl({db:mock([good]),now})('google:test'),true));
test('missing and duplicate grants fail closed',async()=>{assert.equal(await makeOperatorAcl({db:mock([]),now})('google:test'),false);assert.equal(await makeOperatorAcl({db:mock([good,good]),now})('google:test'),false)});
test('expired or missing approval fails',async()=>{assert.equal(await makeOperatorAcl({db:mock([{...good,expiresAt:'2026-01-01T00:00:00Z'}]),now})('google:test'),false);assert.equal(await makeOperatorAcl({db:mock([{...good,approvedBy:''}]),now})('google:test'),false)});
test('member profile is not modified',async()=>{const member={subject:'google:test',status:'active',role:'member'};const a=attachOperatorAcl({credentials:{getNEOpassCredential:async()=>member},isOperator:async()=>true});const r=await a.getNEOpassCredential('google:test');assert.deepEqual(r.permissions,['neo_sales_operator']);assert.equal(member.permissions,undefined)});
