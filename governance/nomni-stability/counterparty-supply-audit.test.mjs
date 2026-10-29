import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditNomniSupply} from './counterparty-supply-audit.mjs';
const base={
 server:{result:{server_ready:true,network:'mainnet',ledger_state:'Following',counterparty_height:973747,backend_height:973747}},
 lastBlock:{result:{block_index:973747}},
 asset:{result:{asset:'NOMNI',asset_id:'6195210',owner:'18FyntJG9hdXYvanm67mGgbyo1P7adckvg',supply:900000000,divisible:false,locked:true}},
 issuances:{result:[
  {asset:'NOMNI',status:'valid',asset_events:'creation',quantity:900000000,block_index:421813,divisible:false},
  {asset:'NOMNI',status:'valid',asset_events:'lock_quantity',quantity:0,block_index:543489,divisible:false},
  {asset:'NOMNI',status:'valid',asset_events:'transfer lock_quantity',quantity:0,block_index:917884,divisible:false},
  {asset:'NOMNI',status:'valid',asset_events:'change_description',quantity:0,block_index:972822,divisible:false}
 ],result_count:4,next_cursor:null},
 holders:{result:[
  {asset:'NOMNI',holding_type:'balances',quantity:894011631},
  {asset:'NOMNI',holding_type:'open_dispenser',quantity:5988369},
 ],result_count:2,next_cursor:null},
 destructions:{result:[],result_count:0,next_cursor:null}
};
const audit = override => auditNomniSupply({...base,...override});

test('synchronized node supply equals issuance and balances plus dispenser escrow',()=>{
 const x=audit();
 assert.equal(x.reportedSupply,'900000000');
 assert.equal(x.issuanceQuantity,'900000000');
 assert.equal(x.holderBalances,'894011631');
 assert.equal(x.openDispenserEscrow,'5988369');
 assert.equal(x.holdingsSum,'900000000');
 assert.equal(x.assetId,'6195210');
 assert.equal(x.genesisBlock,421813);
 assert.equal(x.unexplainedUnits,'0');
 assert.equal(x.outcome,'SINGLE_NODE_PROTOCOL_RECONCILED_NOT_INDEPENDENTLY_ATTESTED');
 for(const k of ['eligibleUsdReservesVerified','issuerLicensingVerified','nomniRedemptionAuthorized','secondIndependentNodeVerified','coinbaseNomniSupport']) assert.equal(x[k],false);
});

test('historical 800m offering cannot replace chain evidence',()=>{
 assert.throws(()=>audit({asset:{result:{...base.asset.result,supply:800000000}}}),/Issuance minus/);
 assert.throws(()=>audit({issuances:{...base.issuances,result:base.issuances.result.map((x,i)=>i?x:{...x,quantity:800000000}}}),/historic creation/i);
});

test('does not accept stale, mismatched or unknown node/network states',()=>{
 for(const state of [
   {server:{result:{...base.server.result,server_ready:false}}},
   {server:{result:{...base.server.result,network:'testnet'}}},
   {server:{result:{...base.server.result,counterparty_height:973746}}},
   {lastBlock:{result:{block_index:973746}}},
   {asset:{result:{...base.asset.result,divisible:true}}},
   {asset:{result:{...base.asset.result,locked:false}}},
 ])assert.throws(()=>audit(state));
});

test('rejects incomplete paging, missing escrow, and unknown holder categories',()=>{
 assert.throws(()=>audit({holders:{...base.holders,next_cursor:'next'}}),/pagination/);
 assert.throws(()=>audit({holders:{...base.holders,result_count:1}}),/pagination/);
 assert.throws(()=>audit({holders:{...base.holders,result:[base.holders.result[0]],result_count:1}}),/Unreconciled/);
 assert.throws(()=>audit({holders:{result:[{asset:'NOMNI',holding_type:'unknown_escrow',quantity:900000000}],result_count:1,next_cursor:null}}),/Unexpected/);
 assert.throws(()=>audit({issuances:{...base.issuances,next_cursor:'more'}}),/pagination/);
});

test('no live node, signer, custodian or credentials are embedded in auditor',async()=>{
 const source=await readFile(new URL('./counterparty-supply-audit.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\bfetch\s*\(|\bimport\s*\(|\bprocess\.env\b|\bWebSocket\b|\bprivateKey\b|\bseedPhrase\b/);
});
