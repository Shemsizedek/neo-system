import test from 'node:test';
import assert from 'node:assert/strict';
import {nmniAlias,terminalOverview,terminalCapabilities,VALUE_UNITS} from './terminal-contracts.mjs';
test('NMNI aliases preserve leading zeros and reject misleading inputs',()=>{
 assert.equal(nmniAlias('NMNI0002'),'NEO:NMNI0002');
 for(const invalid of ['NMNI2','CES-0002','NMNI0002 '])assert.throws(()=>nmniAlias(invalid),/invalid_nmni_account/);
});
test('terminal preserves existing account and never invents asset balances',()=>{
 const value=terminalOverview({accountNumber:'NMNI0002',displayName:'Example',balance:0,role:'member',status:'active'});
 assert.equal(value.routingAlias,'NEO:NMNI0002');
 assert.equal(value.ces.externalCesVerified,false);
 assert.equal(value.instruments.length,5);
 assert.ok(value.instruments.every(x=>x.balance===null&&x.status==='unverified'));
 assert.deepEqual(VALUE_UNITS.map(x=>x.unit),['CES_NMNI','VDOLLAR','TIME_HOUR','NOMNI','BTC','XCP']);
});
test('terminal disallows unimplemented transfers and conversions',()=>{
 const c=terminalCapabilities('member');
 assert.equal(c.mode,'READ_ONLY');
 assert.equal(c.actions.conversions,'disabled');
 assert.equal(c.actions.offchainEvidence,'disabled');
});
