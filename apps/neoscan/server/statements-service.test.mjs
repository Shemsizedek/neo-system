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

test('keeps CES unavailable when no token is supplied',async()=>{
  const fetchImpl=async url=>String(url).includes('/address/')?response({chain_stats:{}}):response({result:[]});
  const cesAdapter={status:()=>({configured:true,network:'test',account:'CES-1'}),getBalance:async()=>{throw new Error('should not call')},getTransactions:async()=>[]};
  const service=createStatementsService({fetchImpl,cesAdapter});
  const statement=await service.buildPublicStatement({address:'1BoatSLRHtKNngkdXEeobR76b53LETtpyT'});
  assert.equal(statement.sources.ces.status,'unavailable');
  assert.equal(statement.reconciliationStatus,'partial');
});
