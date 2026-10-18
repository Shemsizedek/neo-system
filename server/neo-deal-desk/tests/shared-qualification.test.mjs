import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyInboundLead,qualifyAgentDiscovery} from '../shared-qualification.mjs';
test('inbound inquiry is non-executable opportunity',()=>{const result=qualifyInboundLead({id:'lead-001',consent:true,organization:'Example',service:'Strategic Architecture',budget:'$75,000–$150,000',timeline:'1–3 months'});assert.equal(result.status,'qualification_draft');assert.equal(result.actions.payments,false);assert.equal(result.requiresOperatorReview,true);});
test('inbound consent is mandatory',()=>assert.throws(()=>qualifyInboundLead({id:'lead-002',consent:false}),/consented_lead_required/));
test('agent discovery requires provenance',()=>assert.throws(()=>qualifyAgentDiscovery({sourceAgent:'NEO Deal Agent',agentDealId:'test',evidence:{sources:[]}}),/source_evidence_required/));
