import test from 'node:test'
import assert from 'node:assert/strict'
import {createPayoutPsbt,exportSignerEnvelope,finalizeSignedPsbt,broadcastFinalizedTransaction,transactionStatus} from './bitcoinWallet.mjs'

const payout={id:'PAY-1',state:'APPROVED',address:'bc1qexampleaddress0000000000000000000000000',amountBtc:0.005}

test('creates funded PSBT without private keys',async()=>{
  const calls=[]
  const rpc=async(method,params)=>{calls.push({method,params});return {psbt:'cHNidP8BAFakeBase64Payload',fee:0.00001,changepos:1}}
  const record=await createPayoutPsbt({request:payout,feeRateSatVb:8,rpc})
  assert.equal(record.signingMode,'EXTERNAL_SIGNER')
  assert.equal(record.privateKeyIncluded,false)
  assert.equal(calls[0].method,'walletcreatefundedpsbt')
  assert.equal(calls[0].params[3].lockUnspents,true)
})

test('signer envelope contains PSBT but no private key',()=>{
  const env=exportSignerEnvelope({psbtId:'PSBT-1',payoutId:'PAY-1',psbt:'cHNidP8BAFakeBase64Payload'})
  assert.equal(env.protocol,'BIP174')
  assert.equal(env.privateKeyIncluded,false)
})

test('finalize requires complete signed PSBT',async()=>{
  const rpc=async()=>({complete:false,hex:null})
  await assert.rejects(()=>finalizeSignedPsbt({psbtRecord:{psbtId:'PSBT-1',payoutId:'PAY-1'},signedPsbt:'cHNidP8BAFakeSignedPayload',rpc}),/PSBT_NOT_FULLY_SIGNED/)
})

test('broadcast returns txid and confirmation status is tracked',async()=>{
  const txid='a'.repeat(64)
  const rpc=async(method)=>method==='sendrawtransaction'?txid:{confirmations:3,trusted:true,abandoned:false,blockhash:'b'.repeat(64)}
  const broadcast=await broadcastFinalizedTransaction({finalized:{psbtId:'PSBT-1',payoutId:'PAY-1',complete:true,hex:'020000000001fake'},rpc})
  assert.equal(broadcast.txid,txid)
  const status=await transactionStatus({txid,rpc})
  assert.equal(status.confirmations,3)
  assert.equal(status.trusted,true)
})
