import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSqliteStore } from './persistent-store.mjs';

function withStore(fn){
  const dir=mkdtempSync(join(tmpdir(),'neo-dash-'));
  const dbPath=join(dir,'dash.sqlite');
  try{return fn({dir,dbPath});}finally{rmSync(dir,{recursive:true,force:true});}
}

test('provider, quote and job survive database reopen',()=>withStore(({dbPath})=>{
  let store=createSqliteStore(dbPath);
  const provider=store.createProviderApplication({accountId:'acct-driver',requestedRoles:['DRIVER']});
  store.approveProvider(provider.id,{roles:['DRIVER'],authorities:{driverLicense:true,vehicle:true,insurance:true}});
  const quote=store.createQuote({customerId:'acct-rider',serviceType:'RIDE',commercialAmountWorld:18.5,components:[{type:'base',amount:18.5}],pickup:{label:'A'},dropoff:{label:'B'}});
  const job=store.createJob({customerId:'acct-rider',serviceType:'RIDE',commercialAmountWorld:18.5,components:quote.components,pickup:quote.pickup,dropoff:quote.dropoff,settlementAsset:'BTC',state:'MATCHING'});
  job.providerId=provider.id; job.state='OFFERED'; store.saveJob(job);
  store.close();

  store=createSqliteStore(dbPath);
  assert.equal(store.getProvider(provider.id).status,'APPROVED');
  assert.equal(store.getQuote(quote.id).commercialAmountWorld,18.5);
  assert.equal(store.getJob(job.id).providerId,provider.id);
  assert.equal(store.getJob(job.id).state,'OFFERED');
  assert.ok(store.listAuditEvents('job',job.id).length>=2);
  store.close();
}));

test('marketplace support records are durable and auditable',()=>withStore(({dbPath})=>{
  const store=createSqliteStore(dbPath);
  const provider=store.createProviderApplication({accountId:'acct-courier',requestedRoles:['COURIER']});
  const vehicle=store.createVehicle({providerId:provider.id,kind:'CAR',status:'APPROVED'});
  const merchant=store.createMerchant({accountId:'acct-merchant',displayName:'Market One',status:'APPROVED'});
  const quote=store.createQuote({customerId:'acct-customer',serviceType:'GROCERY',commercialAmountWorld:24,components:[]});
  const job=store.createJob({customerId:'acct-customer',serviceType:'GROCERY',commercialAmountWorld:24,components:[],settlementAsset:'NOMNI',state:'MATCHING'});
  const offer=store.createDispatchOffer({jobId:job.id,providerId:provider.id,state:'OFFERED'});
  const payment=store.recordPayment({jobId:job.id,checkoutId:'co_123',settlementAsset:'NOMNI',state:'AUTHORIZED'});
  assert.equal(vehicle.providerId,provider.id);
  assert.equal(merchant.status,'APPROVED');
  assert.equal(offer.jobId,job.id);
  assert.equal(payment.checkoutId,'co_123');
  assert.equal(store.listAuditEvents('payment',payment.id)[0].eventType,'PAYMENT_RECORDED');
  assert.equal(store.getQuote(quote.id).customerId,'acct-customer');
  store.close();
}));
