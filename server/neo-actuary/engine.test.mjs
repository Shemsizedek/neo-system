import test from 'node:test';
import assert from 'node:assert/strict';
import {assessTreasury} from './engine.mjs';
const base={currency:'USD',asOf:'2026-10-24',assets:[{id:'a',currency:'USD',amountMinor:'10000',verified:true,evidenceId:'doc-1'}],liabilities:[{id:'l',currency:'USD',amountMinor:'8000',verified:true,evidenceId:'doc-2'}]};
test('net position and conservative stress use minor units',()=>{
 const result=assessTreasury({...base,scenario:{assetHaircutBps:2000,liabilityShockBps:1000}});
 assert.equal(result.observed.netMinor,'2000');
 assert.equal(result.observed.coverageBps,'12500');
 assert.equal(result.stress.assetsMinor,'8000');
 assert.equal(result.stress.liabilitiesMinor,'8800');
 assert.equal(result.stress.shortfallMinor,'800');
});
test('reject unverified or ungrounded assets',()=>{
 assert.throws(()=>assessTreasury({...base,assets:[{...base.assets[0],verified:false}]}),/Unverified/);
 assert.throws(()=>assessTreasury({...base,assets:[{...base.assets[0],evidenceId:''}]}),/Evidence/);
});
test('reject mixed units and invalid parameters',()=>{
 assert.throws(()=>assessTreasury({...base,assets:[{...base.assets[0],currency:'BTC'}]}),/Mixed/);
 assert.throws(()=>assessTreasury({...base,scenario:{assetHaircutBps:10001}}),/bps/);
});
test('no obligations means undefined coverage',()=>{
 const result=assessTreasury({...base,liabilities:[]});
 assert.equal(result.observed.coverageBps,null);
 assert.equal(result.stress.shortfallMinor,'0');
});
