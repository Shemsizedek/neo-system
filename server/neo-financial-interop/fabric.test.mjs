import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadFinancialSurfaceContract,planFinancialOperation,validateSurfaceSeparation} from './fabric.mjs';
const cfg=loadFinancialSurfaceContract();
const intent={surface:'NEOPAY',operation:'BTC_DONATION_REQUEST',workspace:'TEAM',actorRef:'agent-temple-001',accountRef:'team-organization-001',asset:'BTC',idempotencyKey:'safe-payment-request-key-01'};

test('distinct independently owned financial UIs, hosts and source directories',()=>{
 assert.deepEqual(validateSurfaceSeparation(cfg).hosts.sort(),[
  'counterpay.holytemples.org','neobank.holytemples.org','neofx.holytemples.org','pay.holytemples.org'
 ].sort());
 const live=JSON.parse(readFileSync(new URL('../../config/neo-ui-production.json',import.meta.url),'utf8'));
 const list=[...live.surfaces,...(live.plannedSurfaces||[])];
 for (const [key,id] of [['NEOPAY','neopay'],['NEOBANK','neo-bank'],['NEOFX','neo-exchange']]) {
  const current=list.find(s=>s.id===id);
  assert.ok(current,`${id} registered`);
  assert.equal(current.host,cfg.surfaces[key].host);
 }
 assert.equal(cfg.surfaces.COUNTERPAY.sourceBinding,'unverified');
});

test('NEO Pay can prepare receiving request through Counterpay without embedding Counterpay UI',()=>{
 const p=planFinancialOperation(intent);
 assert.equal(p.host,'pay.holytemples.org');
 assert.equal(p.service,'COUNTERPAY_RAIL');
 assert.equal(p.mode,'PREPARE_ONLY');
 assert.equal(p.approvalState,'NOT_VERIFIED');
 assert.equal(p.executed,false);
 assert.equal(p.broadcast,false);
 assert.equal(p.customerSignatureRequired,true);
});

test('NEO Bank and Nibiru are backend providers for CES credit, with team isolation',()=>{
 const p=planFinancialOperation({...intent,surface:'NEOBANK',workspace:'PERSONAL',operation:'CES_CREDIT_TRANSFER_INTENT',asset:'V_DOLLAR'});
 assert.equal(p.service,'NEO_BANK');assert.equal(p.nextService,'NIBIRU_RESERVE');
 assert.equal(p.mode,'PREPARE_ONLY');assert.equal(p.postedToLedger,false);
 assert.equal(p.workspace,'PERSONAL');
});

test('conversion quote reuses existing engine without representing execution or liquidity',()=>{
 const p=planFinancialOperation({...intent,surface:'NEOFX',operation:'CONVERSION_QUOTE',asset:'NOMNI'});
 assert.equal(p.service,'NEO_CONVERSION');assert.equal(p.mode,'READ_ONLY');assert.equal(p.converted,false);
});

test('on and off ramps blocked pending actual provider and regulatory checks',()=>{
 for(const operation of ['FIAT_ONRAMP_INTENT','FIAT_OFFRAMP_INTENT']){
  const p=planFinancialOperation({...intent,operation,asset:'USD'});
  assert.equal(p.mode,'BLOCKED_PROVIDER_AND_REGULATORY_GATE');
  assert.equal(p.executed,false);
 }
});

test('fail closed on unsupported asset, missing identity and browser-forged authorization',()=>{
 for(const patch of [
  {asset:'ETH'},{asset:'XCP'},{workspace:'OTHER'},{accountRef:'bad space'},
  {idempotencyKey:'short'},{authorization:'approved'}, {surface:'NEOBANK_UI_MERGED'}
 ]) assert.throws(()=>planFinancialOperation({...intent,...patch}));
 assert.throws(()=>planFinancialOperation(intent,{...cfg,rules:{...cfg.rules,productionExecutionEnabled:true}}),/unsafe_contract_configuration/);
});

test('reject merged UI owners and broken accounting assumptions',()=>{
 const shared=structuredClone(cfg);
 shared.surfaces.NEOBANK.host=shared.surfaces.NEOPAY.host;
 assert.throws(()=>validateSurfaceSeparation(shared),/unique_hosts/);
 const illegal=structuredClone(cfg);illegal.rules.cesCreditsNotAssumedToBeCashOrReserves=false;
 assert.throws(()=>validateSurfaceSeparation(illegal),/surface_policy_invariant/);
});
