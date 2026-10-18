import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAgentDeskHandoff} from '../deal-agent-handoff.mjs';
const sample={
 sourceAgent:'NEO Deal Agent',
 agentDealId:'NDA-001',
 organization:'Example Institution',
 intent:'custom platform',
 sector:'university',
 observedAt:'2026-10-18T18:00:00Z',
 evidence:{sources:[{url:'https://example.org/brief',title:'Public business brief',sourceType:'public_web'}]}
};
test('evidence-backed handoff produces approval-controlled draft',()=>{
 const h=buildAgentDeskHandoff(sample);
 assert.equal(h.state,'review_required');
 assert.equal(h.transactionMode,'disabled');
 assert.equal(h.controls.initiatePayment,false);
 assert.ok(h.provenance.sourceCount>=1);
});
test('provenance required',()=>assert.throws(()=>buildAgentDeskHandoff({...sample,evidence:{sources:[]}}),/source_evidence_required/));
test('execution cannot be requested',()=>assert.throws(()=>buildAgentDeskHandoff({...sample,requestedAction:'execute'}),/execution_disabled/));
test('agent identity required',()=>assert.throws(()=>buildAgentDeskHandoff({...sample,sourceAgent:'unknown'}),/unrecognized_agent/));
