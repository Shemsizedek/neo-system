import test from 'node:test'
import assert from 'node:assert/strict'
import {createMerchantLedger,creditFinalPayment,holdReserve,releaseReserve,createSettlementBatch,reconcileBatch,createPayout,approvePayout,recordPayoutEvidence,createRefund,treasurySnapshot} from './fabric.mjs'

test('final payment credits merchant balance only with evidence',()=>{const l=createMerchantLedger();const x=creditFinalPayment(l,{merchant_id:'m',asset:'BTC',amount:2,payment_id:'p',settlement_evidence_ref:'tx'});assert.equal(x.balance.available,2)})
test('reserve reduces available balance',()=>{const l=createMerchantLedger();creditFinalPayment(l,{merchant_id:'m',asset:'BTC',amount:2,payment_id:'p',settlement_evidence_ref:'tx'});const h=holdReserve(l,{merchant_id:'m',asset:'BTC',amount:.5});assert.equal(h.balance.available,1.5);assert.equal(releaseReserve(l,h.reserve).balance.available,2)})
test('batch must reconcile before payout',()=>{const l=createMerchantLedger();creditFinalPayment(l,{merchant_id:'m',asset:'BTC',amount:2,payment_id:'p',settlement_evidence_ref:'tx'});let b=createSettlementBatch({batch_id:'b',merchant_id:'m',asset:'BTC',payment_ids:['p'],gross_amount:2,fees:.1});b=reconcileBatch(b,{verifiedPaymentIds:['p'],ledgerBalance:{available:2}});const p=approvePayout(createPayout({payout_id:'po',batch:b,destination:'bc1x'}),{approved:true});assert.equal(recordPayoutEvidence(p,{txid:'t',confirmed:true}).state,'CONFIRMED')})
test('refund requires original final payment',()=>{assert.throws(()=>createRefund({refund_id:'r',merchant_id:'m',payment_id:'p',asset:'BTC',amount:1,destination:'bc1x'}),/original_final_payment_required/)})
test('treasury never stores private keys',()=>{assert.equal(treasurySnapshot({ledger:createMerchantLedger()}).private_keys_stored,false)})
