import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryCrmStore, normalizeCrmRecord } from './crm-store.mjs';

test('normalizes membership CRM records',()=>{
  const record=normalizeCrmRecord({type:'member',name:'Temple Member',status:'active',owner:'member@example.com',endpoint:'+1 210 555 0144',version:'Patron',tags:'wire, neogram'});
  assert.equal(record.type,'member');
  assert.equal(record.owner,'member@example.com');
  assert.equal(record.endpoint,'+1 210 555 0144');
  assert.equal(record.version,'Patron');
  assert.deepEqual(record.tags,['wire','neogram']);
});

test('stores and lists membership CRM records separately',async()=>{
  const store=createInMemoryCrmStore({id:()=> 'member-1',now:()=> '2026-09-12T22:45:00.000Z'});
  await store.create({type:'member',name:'Temple Member',status:'active',owner:'member@example.com'},'executive-admin');
  const members=await store.list({type:'member'});
  assert.equal(members.length,1);
  assert.equal(members[0].name,'Temple Member');
});
