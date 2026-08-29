import test from 'node:test';
import assert from 'node:assert/strict';
import {CES_INGESTION_SCHEMA,createCesIngestionStore,normalizeCesSnapshot} from './ingestion.mjs';

test('normalizes an authorized CES snapshot without enabling writes',()=>{
  const snapshot=normalizeCesSnapshot({account:'CES-001',network:'neo-ces',observedAt:'2026-08-29T20:00:00Z',balances:[{currency:'USD',balance:'25.50'}],transactions:[{id:'tx-1',currency:'USD',amount:'-5',timestamp:'2026-08-29T19:00:00Z'}],provenance:{method:'coordinator-export',reference:'statement-1'}});
  assert.equal(snapshot.schema,CES_INGESTION_SCHEMA);
  assert.equal(snapshot.readOnly,true);
  assert.equal(snapshot.balances[0].amount,25.5);
  assert.equal(snapshot.transactions[0].reference,'tx-1');
  assert.equal(snapshot.provenance.method,'coordinator-export');
});

test('rejects snapshots without an account',()=>{
  assert.throws(()=>normalizeCesSnapshot({balances:[]}),/account is required/);
});

test('store exposes only ingest, current and status operations',()=>{
  const store=createCesIngestionStore();
  assert.deepEqual(Object.keys(store).sort(),['current','ingest','status']);
  assert.equal(store.status().loaded,false);
  store.ingest({account:'CES-001',balances:[],transactions:[]});
  assert.equal(store.status().loaded,true);
});
