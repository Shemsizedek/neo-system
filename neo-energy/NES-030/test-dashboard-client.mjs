import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSyntheticOverview} from './dashboard-client.mjs';
const args={endpoint:'/v1/energy/tenants/t/sites/s/overview',token:'fabricated-token'};
const payload={mode:'SIMULATION_ONLY',tenant:'t',site:'s',import_kwh:'10',
  export_kwh:'2',payment_due:false,field_control_authorized:false};
test('loads only explicitly synthetic read-only records',async()=>{
 const x=await loadSyntheticOverview({...args,fetchImpl:async(url,options)=>{
  assert.equal(options.method,'GET');assert.equal(options.cache,'no-store');
  return {ok:true,json:async()=>payload};
 }});
 assert.equal(x.label,'SIMULATED — NOT A BILL');
});
test('denies unauthenticated client',async()=>{
 await assert.rejects(loadSyntheticOverview({endpoint:args.endpoint}));
});
test('denies absolute endpoints',async()=>{
 await assert.rejects(loadSyntheticOverview({...args,endpoint:'https://example.test/collect'}));
});
test('denies unsafe billable results',async()=>{
 await assert.rejects(loadSyntheticOverview({...args,fetchImpl:async()=>({
  ok:true,json:async()=>({...payload,payment_due:true})
 })}));
});
test('denies unauthorized responses',async()=>{
 await assert.rejects(loadSyntheticOverview({...args,fetchImpl:async()=>({ok:false,status:403})}));
});
