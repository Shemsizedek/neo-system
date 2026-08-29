import test from 'node:test';
import assert from 'node:assert/strict';
import {createStatementsService} from './statements-service.mjs';

function response(body,status=200){return {ok:status>=200&&status<300,status,json:async()=>body}}

test('builds a public statement without leaking CES token',async()=>{
  const seen=[];
  const fetchImpl=async url=>{
    seen.push(String(url));
    if(String(url).includes('/address/'))return response({chain_stats:{funded_txo_sum:200000000,spent_txo_sum:50000000}});
    return response({result:[{asset:'NOMNI',quantity_normalized:'12'}]});
  };
  const cesAdapter={
    status:()=>({configured:true,network:'test',account:'CES-1'}),
    getBalance:async()=>({source:'ces',reference:'b1',unit:'CES',amount:10,observedAt:'2026-08-28T00:00:00Z',verificationStatus:'verified',recordType:'balance'}),
    getTransactions:async()=>[]
  };
  const service=createStatementsService({fetchImpl,cesAdapter});
  const statement=await service.buildPublicStatement({address:'1BoatSLRHtKNngkdXEeobR76b53LETtpyT',cesToken:'super-secret'});
  assert.equal(statement.sources.bitcoin.entries[0].amount,1.5);
  assert.equal(statement.sources.counterparty.entries[0].unit,'NOMNI');
  assert.equal(statement.sources.ces.status,'verified');
  assert.equal(JSON.stringify(statement).includes('super-secret'),false);
  assert.equal(statement.consolidatedTotal,null);
  assert.equal(seen.length,2);
});

test('keeps CES unavailable when no token or imported snapshot is supplied',async()=>{
  const fetchImpl=async url=>String(url).includes('/address/')?response({chain_stats:{}}):response({result:[]});
  const cesAdapter={status:()=>({configured:true,network:'test',account:'CES-1'}),getBalance:async()=>{throw new Error('should not call')},getTransactions:async()=>[]};
  const service=createStatementsService({fetchImpl,cesAdapter});
  const statement=await service.buildPublicStatement({address:'1BoatSLRHtKNngkdXEeobR76b53LETtpyT'});
  assert.equal(statement.sources.ces.status,'unavailable');
  assert.equal(statement.reconciliationStatus,'partial');
});

test('prefers normalized authorized-session CES snapshots over legacy token reads',async()=>{
  const fetchImpl=async url=>String(url).includes('/address/')?response({chain_stats:{}}):response({result:[]});
  let legacyReads=0;
  const cesAdapter={status:()=>({configured:true,network:'legacy',account:'LEGACY'}),getBalance:async()=>{legacyReads++;return {}},getTransactions:async()=>{legacyReads++;return []}};
  const service=createStatementsService({fetchImpl,cesAdapter});
  service.ingestCesSnapshot({
    account:'CES-001',network:'CEN',observedAt:'2026-08-29T20:00:00Z',
    balances:[{unit:'NOMNI',amount:144,reference:'balance:NOMNI'}],
    transactions:[{reference:'tx-1',unit:'WC',amount:-9,observedAt:'2026-08-29T19:00:00Z'}],
    provenance:{method:'authorized-session',reference:'runtime:ces-001'}
  });
  const statement=await service.buildPublicStatement({address:'1BoatSLRHtKNngkdXEeobR76b53LETtpyT',cesToken:'legacy-token'});
  assert.equal(legacyReads,0);
  assert.equal(statement.sources.ces.status,'imported');
  assert.equal(statement.sources.ces.entries.length,2);
  assert.equal(statement.sources.ces.entries[0].unit,'NOMNI');
  assert.equal(statement.sources.ces.entries[1].unit,'WC');
  assert.equal(statement.consolidatedTotal,null);
  assert.equal(statement.reconciliationStatus,'multi-ledger-observed');
});

test('exposes a compact read-only CES operations summary without session material',()=>{
  const service=createStatementsService({cesAdapter:{status:()=>({configured:false,network:null,account:null})}});
  service.ingestCesSnapshot({
    account:'CES-009',network:'CEN',observedAt:'2026-08-29T20:30:00Z',
    balances:[{unit:'NOMNI',amount:12},{unit:'WC',amount:3}],
    transactions:[{reference:'tx-9',unit:'NOMNI',amount:1,observedAt:'2026-08-29T20:29:00Z'}],
    provenance:{method:'authorized-session',reference:'runtime'}
  });
  const summary=service.cesStatus();
  assert.equal(summary.status,'imported');
  assert.equal(summary.readOnly,true);
  assert.equal(summary.balanceCount,2);
  assert.equal(summary.transactionCount,1);
  assert.deepEqual(summary.units,['NOMNI','WC']);
  assert.equal(JSON.stringify(summary).includes('cookie'),false);
  assert.equal(JSON.stringify(summary).includes('token'),false);
});
