import test from 'node:test'
import assert from 'node:assert/strict'
import {treasuryPolicy,classifyApprovalTier,evaluateTreasuryPayout,buildUnsignedPayout,assertExternalSignerResult,coldReserveAction} from './treasury.mjs'

const approved={id:'PAY-1',state:'APPROVED',address:'bc1qexampleaddress0000000000000000000000000',amountBtc:0.005}

test('classifies approval tiers',()=>{
  assert.equal(classifyApprovalTier(0.005).tier,'STANDARD')
  assert.equal(classifyApprovalTier(0.05).tier,'ELEVATED')
  assert.equal(classifyApprovalTier(0.5).tier,'TREASURY')
})

test('enforces approvals daily limit and hot wallet floor',()=>{
  const policy=treasuryPolicy({dailyLimitBtc:0.1,hotWalletFloorBtc:0.01})
  const ok=evaluateTreasuryPayout({request:approved,policy,hotWalletBalanceBtc:0.03,dailyBroadcastBtc:0.01,approvals:['a1']})
  assert.equal(ok.ok,true)
  assert.throws(()=>evaluateTreasuryPayout({request:{...approved,amountBtc:0.05},policy,hotWalletBalanceBtc:0.2,dailyBroadcastBtc:0,approvals:['a1']}),/INSUFFICIENT_TREASURY_APPROVALS/)
  assert.throws(()=>evaluateTreasuryPayout({request:approved,policy,hotWalletBalanceBtc:0.012,dailyBroadcastBtc:0,approvals:['a1']}),/HOT_WALLET_LIQUIDITY_INSUFFICIENT/)
})

test('builds unsigned intent and validates external signer result',()=>{
  const intent=buildUnsignedPayout({request:approved,feeRateSatVb:8})
  assert.equal(intent.privateKeyIncluded,false)
  const signed=assertExternalSignerResult({intent,signedTransaction:'0200000001abcdefabcdefabcdef',txid:'a'.repeat(64)})
  assert.equal(signed.txid,'a'.repeat(64))
})

test('recommends reserve actions without moving funds',()=>{
  assert.equal(coldReserveAction({hotWalletBalanceBtc:0.005,policy:{hotWalletFloorBtc:0.01,hotWalletTargetBtc:0.05}}).action,'REFILL_HOT_FROM_COLD_APPROVAL_REQUIRED')
  assert.equal(coldReserveAction({hotWalletBalanceBtc:0.2,policy:{hotWalletFloorBtc:0.01,hotWalletTargetBtc:0.05}}).action,'SWEEP_EXCESS_TO_COLD')
})
