import test from 'node:test'
import assert from 'node:assert/strict'
import {createServicingAccount,createPaymentRecord,allocatePayment,evaluateDelinquency,cureDelinquency,createCovenant,evaluateCovenant,createRestructuring,recordDefaultEvent,createRecoveryRecord,performanceSnapshot,servicingSnapshot} from './fabric.mjs'

test('verified payment allocates fees interest then principal',()=>{const a=createServicingAccount({servicing_id:'s',advance_id:'a',facility_id:'f',original_principal:100,accrued_interest:10,fees_due:5});const p=createPaymentRecord({payment_id:'p',servicing_id:'s',amount:20,evidence_ref:'tx',verified:true});const x=allocatePayment(a,p);assert.equal(x.payment.allocation.fees,5);assert.equal(x.payment.allocation.interest,10);assert.equal(x.payment.allocation.principal,5)})
test('unverified payment cannot post',()=>{const a=createServicingAccount({servicing_id:'s',advance_id:'a',facility_id:'f',original_principal:10}),p=createPaymentRecord({payment_id:'p',servicing_id:'s',amount:1});assert.throws(()=>allocatePayment(a,p),/verified_payment_evidence_required/)})
test('delinquency is date driven',()=>{const a=createServicingAccount({servicing_id:'s',advance_id:'a',facility_id:'f',next_due_at:'2026-01-01T00:00:00Z'});assert.equal(evaluateDelinquency(a,{asOf:new Date('2026-02-01T00:00:00Z')}).state,'DELINQUENT')})
test('covenant breach is explicit',()=>{const c=createCovenant({covenant_id:'c',servicing_id:'s',metric:'coverage',threshold:1.2});assert.equal(evaluateCovenant(c,{value:1}).state,'BREACH')})
test('default requires policy and evidence',()=>{assert.throws(()=>recordDefaultEvent({default_id:'d',servicing_id:'s'}),/default policy and evidence required/)})
test('recovery has no external enforcement',()=>{assert.equal(createRecoveryRecord({recovery_id:'r',servicing_id:'s',amount:1}).external_enforcement,false)})
test('performance exposes Metro2 adapter status',()=>{const a=createServicingAccount({servicing_id:'s',advance_id:'a',facility_id:'f'});assert.equal(performanceSnapshot(a).metro2_mapping_status,'ADAPTER_REQUIRED')})
test('snapshot keeps enforcement off',()=>{assert.equal(servicingSnapshot({}).external_enforcement,false)})
