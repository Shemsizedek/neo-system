import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostgresDocumentStore} from './postgres-document-store.mjs';

test('requires explicit pool and rejects unsafe identifiers',async()=>{
  assert.throws(()=>createPostgresDocumentStore(),/postgres_pool_required/);
  const store=createPostgresDocumentStore({pool:{query:async()=>({rows:[]})}});
  await assert.rejects(store.get('wallets','../escape'),/invalid_document_identifier/);
  await assert.rejects(store.put('wallets','safe',[],{}),/document_object_required/);
  await assert.rejects(store.list('wallets',{limit:501}),/invalid_list_limit/);
});
test('reads parameterized records and supports optimistic concurrency',async()=>{
  const calls=[];
  const pool={query:async(sql,args)=>{calls.push({sql,args});if(sql.startsWith('SELECT'))return {rows:[{body:{asset:'NOMNI'},version:'2'}]};if(sql.startsWith('UPDATE'))return {rows:[]};return {rows:[{version:'1'}]};}};
  const store=createPostgresDocumentStore({pool});
  assert.deepEqual(await store.get('wallets','account_1'),{id:'account_1',version:2,value:{asset:'NOMNI'}});
  await assert.rejects(store.put('wallets','account_1',{asset:'BTC'},{expectedVersion:2}),/document_version_conflict/);
  assert.deepEqual(calls[0].args,['wallets','account_1']);
  assert.deepEqual(calls[1].args,['wallets','account_1',JSON.stringify({asset:'BTC'}),2]);
});
test('pagination returns bounded records and cursor',async()=>{
  const pool={query:async()=>({rows:[{id:'a',body:{n:1},version:'1'},{id:'b',body:{n:2},version:'2'}]})};
  const store=createPostgresDocumentStore({pool});
  assert.deepEqual(await store.list('assets',{limit:1}),{rows:[{id:'a',version:1,value:{n:1}}],nextCursor:'a'});
});
