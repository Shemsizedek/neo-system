'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createPhaxioTestAdapter}=require('./phaxio-test-adapter.cjs');
const id='14e0410e-cc2b-4949-a355-4cc54259e6d3';
test('adapter fails closed by default',async()=>{
 const a=createPhaxioTestAdapter();assert.equal(a.canTransmit,false);
 await assert.rejects(a.simulate(id),/provider_adapter_disabled/);
 await assert.rejects(a.sendFax({}),/fax_transmission_disabled/);
});
test('simulation still prohibits real fax',async()=>{
 const a=createPhaxioTestAdapter({enabled:true}),out=await a.simulate(id);
 assert.equal(out.status,'SIMULATED');assert.equal(out.transmitted,false);
 await assert.rejects(a.sendFax({}),/fax_transmission_disabled/);
});
