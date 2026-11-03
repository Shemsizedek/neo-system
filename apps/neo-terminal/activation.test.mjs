import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateActivation,inspectNomniMarket,REQUIRED_GATES} from './activation.js';
const mock=data=>async()=>({ok:true,json:async()=>data});
test('empty evidence blocks trading',()=>{const result=evaluateActivation();assert.equal(result.state,'BLOCKED');assert.equal(result.publicTradingEnabled,false)});
test('even full evidence cannot silently activate execution',()=>{const all=Object.fromEntries(REQUIRED_GATES.map(key=>[key,{verified:true,reference:'signed-evidence-'+key}]));const result=evaluateActivation(all);assert.equal(result.state,'READY_FOR_INDEPENDENT_REVIEW');assert.equal(result.executionEnabled,false)});
test('asset metadata and order discovery do not establish USD redemption',async()=>{let count=0;const fetchImpl=async()=>{count++;return mock(count===1?{result:{asset:'NOMNI',issuer:'issuer'}}:{result:[{status:'open',give_asset:'NOMNI',get_asset:'USD',tx_hash:'tx'},{status:'open',give_asset:'NOMNI',get_asset:'XCP'}]})()};const result=await inspectNomniMarket({fetchImpl});assert.equal(result.counterpartyOrdersObserved,1);assert.equal(result.executable,false);assert.equal(result.usdInstrument,'UNVERIFIED')});
