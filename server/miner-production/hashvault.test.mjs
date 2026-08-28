import test from 'node:test'
import assert from 'node:assert/strict'
import {reconcilePoolPayout,createHashVaultCredit,hashVaultSnapshot,assertNoDuplicateCredit} from './hashvault.mjs'

const shares=[
  {shareId:'s1',minerId:'m1',contractId:'c1',allocationId:'a1',poolId:'p1',difficulty:75,accepted:true,verified:true,accountingEligible:true},
  {shareId:'s2',minerId:'m2',contractId:'c2',allocationId:'a2',poolId:'p1',difficulty:25,accepted:true,verified:true,accountingEligible:true}
]

test('reconciles confirmed real payout by verified difficulty',()=>{
  const r=reconcilePoolPayout({payout:{payoutId:'pay1',poolId:'p1',txid:'tx1',amountBtc:0.01,confirmed:true,simulation:false},verifiedShares:shares})
  assert.equal(r.attributions.length,2)
  assert.equal(r.attributions.find(x=>x.contractId==='c1').grossBtc,0.0075)
})

test('blocks simulation and unconfirmed payouts',()=>{
  assert.throws(()=>reconcilePoolPayout({payout:{payoutId:'p',poolId:'p1',txid:'t',amountBtc:1,confirmed:false},verifiedShares:shares}),/UNCONFIRMED/)
  assert.throws(()=>reconcilePoolPayout({payout:{payoutId:'p',poolId:'p1',txid:'t',amountBtc:1,confirmed:true,simulation:true},verifiedShares:shares}),/SIMULATION/)
})

test('posts fee-accounted customer credit and summarizes balances',()=>{
  const r=reconcilePoolPayout({payout:{payoutId:'pay1',poolId:'p1',txid:'tx1',amountBtc:0.01,confirmed:true,simulation:false},verifiedShares:shares})
  const a=r.attributions.find(x=>x.contractId==='c1')
  const e=createHashVaultCredit({attribution:a,customerId:'cust1',poolFeePct:2,serviceFeePct:5,electricityFeeBtc:0.0001})
  assert.equal(e.state,'POSTED')
  const s=hashVaultSnapshot([e])
  assert.equal(s.postedCredits,1)
  assert.equal(s.customers[0].customerId,'cust1')
  assert.throws(()=>{assertNoDuplicateCredit([e],a)},/ALREADY_CREDITED/)
})
