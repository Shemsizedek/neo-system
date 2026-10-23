import test from 'node:test'
import assert from 'node:assert/strict'
import {detectDuplicateTradelines,matchIdentity,reconcileBalance,evaluateDisputeSla,evaluateCorrectionAging,reconcileReportingCycle,reconciliationSnapshot} from './fabric.mjs'

test('duplicate tradelines block clean state',()=>{const x=detectDuplicateTradelines([{tradeline_id:'1',subject_id:'s',account_ref:'a',creditor_ref:'c',account_type:'I'},{tradeline_id:'2',subject_id:'s',account_ref:'a',creditor_ref:'c',account_type:'I'}]);assert.equal(x.clean,false)})
test('identity mismatch is explicit',()=>{assert.equal(matchIdentity({tradeline:{subject_id:'s',account_ref:'a'},account:{institution_id:'x',account_id:'a'}}).matched,false)})
test('balance reconciliation uses tolerance',()=>{assert.equal(reconcileBalance({tradelineBalance:100,servicingBalance:100.005,fundingBalance:100,tolerance:.01}).matched,true)})
test('dispute SLA detects stale open disputes',()=>{const r=evaluateDisputeSla([{dispute_id:'d',status:'OPEN',opened_at:'2026-01-01T00:00:00Z'}],{maxOpenDays:30,asOf:new Date('2026-03-01T00:00:00Z')});assert.equal(r.within_sla,false)})
test('correction aging detects stale corrections',()=>{const r=evaluateCorrectionAging([{correction_id:'c',status:'PENDING',created_at:'2026-01-01T00:00:00Z'}],{maxPendingDays:10,asOf:new Date('2026-02-01T00:00:00Z')});assert.equal(r.within_limit,false)})
test('material mismatches block reporting',()=>{const cycle=reconcileReportingCycle({tradelines:[{tradeline_id:'t',subject_id:'s',account_ref:'a',creditor_ref:'c',account_type:'I',current_balance:10}],accounts:[]});assert.equal(cycle.reporting_allowed,false)})
test('snapshot exposes reporting block policy',()=>{assert.equal(reconciliationSnapshot({}).reporting_block_policy,true)})
