import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyInboundLead,qualifyAgentDiscovery} from '../shared-qualification.mjs';
import {operatorLeadView,postgresLeadStore} from '../lead-storage.mjs';
import {makeLeadIntake} from '../lead-intake.mjs';

const lead={id:'a0000000-0000-4000-a000-000000000001',consent:true,organization:'Institution Demo',service:'Strategic Architecture',budget:'$75,000–$150,000',timeline:'1–3 months'};
function fakeRes(){const out={status:null,body:null};return {out,writeHead(status){out.status=status},end(s){out.body=JSON.parse(s)}};}
test('inbound lead routes to non-executable opportunity',()=>{
 const draft=qualifyInboundLead(lead);
 assert.equal(draft.source,'customer_inquiry');
 assert.equal(draft.actions.payments,false);
 assert.equal(draft.requiresOperatorReview,true);
});
test('Deal Agent cannot hand over executable instruction',()=>{
 assert.throws(()=>qualifyAgentDiscovery({sourceAgent:'NEO Deal Agent',agentDealId:'NDA-101',requestedAction:'execute',evidence:{sources:[{url:'https://example.org/report'}]}}),/execution_disabled/);
});
test('operator dashboard rejects forged role without middleware verification',async()=>{
 const res=fakeRes();
 await operatorLeadView({},res,{identity:{roles:['neo_sales_operator'],verified:false},store:{listMetadata:async()=>[]}});
 assert.equal(res.out.status,403);
});
test('lead handler stays closed until dependencies are enabled',async()=>{
 const res=fakeRes();
 await makeLeadIntake({origin:'https://desk.holytemples.org',enabled:false})({method:'POST'},res);
 assert.equal(res.out.status,503);
});
test('store prevents interpolation of raw lead values',async()=>{
 const statements=[];
 const store=postgresLeadStore({async query(sql,params){statements.push({sql,params});return {rows:[{id:lead.id}]}}});
 await store.insertIfAbsent('f'.repeat(64),{...lead,email:'bad\' ; DROP TABLE neo_sales_leads; --'});
 assert.match(statements[0].sql,/VALUES \(\$1,\$2/);
 assert.doesNotMatch(statements[0].sql,/DROP TABLE/);
});
