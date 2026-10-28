import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateCrownCase,requestStage} from './case-workflow.mjs';
const base={schema:'NEO-CROWN-CASE-V1',case_id:'DEMO-001',client_ref:'CLIENT-001',asset:'NOMNI',network:'bitcoin-mainnet',protocol:'counterparty',stage:'draft'};
test('draft is permissible but not a transaction authorization',()=>{const r=evaluateCrownCase(base);assert.equal(r.allowed,true);assert.equal(r.may_broadcast,false);});
test('cannot skip onboarding',()=>{assert.equal(requestStage(base,'issuer_authorized',{}).allowed,false)});
test('cannot authorize issuer without dual approval and legal checks',()=>{const r=evaluateCrownCase({...base,stage:'issuer_authorized'});assert.equal(r.allowed,false);assert.ok(r.issues.includes('dual_approval_missing'))});
test('no public release without ledger evidence',()=>{const r=evaluateCrownCase({...base,stage:'published'});assert.equal(r.allowed,false);assert.ok(r.issues.includes('ledger_reconciliation_missing'));assert.equal(r.may_sign,false)});
