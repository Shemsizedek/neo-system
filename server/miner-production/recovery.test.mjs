import test from 'node:test'
import assert from 'node:assert/strict'
import {classifyRecoveryCase,inspectPayoutRecovery,runRecoverySweep,RECOVERY_ACTIONS} from './recovery.mjs'

const payout=(patch={})=>({id:'PAY-1',state:'APPROVED',txid:null,...patch})

test('confirmed payout without receipt requires receipt finalization',()=>{
  const r=classifyRecoveryCase({payout:payout({state:'CONFIRMED',txid:'a'.repeat(64)}),receipt:null})
  assert.equal(r.action,RECOVERY_ACTIONS.FINALIZE_RECEIPT)
})

test('broadcast payout syncs chain status without rebroadcasting',async()=>{
  const r=await inspectPayoutRecovery({payout:payout({state:'BROADCAST',txid:'b'.repeat(64)}),transactionStatus:async txid=>({txid,confirmations:2,abandoned:false})})
  assert.equal(r.action,RECOVERY_ACTIONS.SYNC_CHAIN)
  assert.equal(r.chain.confirmations,2)
})

test('ambiguous chain lookup fails closed to operator hold',async()=>{
  const r=await inspectPayoutRecovery({payout:payout({state:'CONFIRMING',txid:'c'.repeat(64)}),transactionStatus:async()=>{throw new Error('RPC_DOWN')}})
  assert.equal(r.action,RECOVERY_ACTIONS.HOLD_FOR_OPERATOR)
  assert.equal(r.reason,'CHAIN_LOOKUP_AMBIGUOUS')
})

test('finalized transaction without recorded broadcast becomes incident-worthy hold',()=>{
  const r=classifyRecoveryCase({payout:payout(),finalized:{complete:true,hex:'deadbeef'}})
  assert.equal(r.action,RECOVERY_ACTIONS.HOLD_FOR_OPERATOR)
  assert.equal(r.reason,'FINALIZED_TX_WITHOUT_RECORDED_TXID')
})

test('sweep ignores settled states and inspects unfinished payouts',async()=>{
  const sweep=await runRecoverySweep({payouts:[payout(),payout({id:'PAY-2',state:'SETTLED'})],transactionStatus:async()=>({confirmations:0})})
  assert.equal(sweep.checked,1)
  assert.equal(sweep.results[0].action,RECOVERY_ACTIONS.RESUME_SIGNING)
})
