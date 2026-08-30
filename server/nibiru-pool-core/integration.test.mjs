import test from 'node:test'
import assert from 'node:assert/strict'
import {templateAdapter} from './bitcoinTemplate.mjs'
import {buildMiningJob,validateShareSubmission,classifyVerifiedShare} from './stratumBoundary.mjs'
import {toProductionEvent,confirmBlockProduction,generatorAttribution} from './productionBridge.mjs'

const fakeRpc=async(method)=>{
  if(method!=='getblocktemplate') throw new Error('UNEXPECTED_RPC')
  return {height:900000,previousblockhash:'00'.repeat(32),bits:'170fffff',version:536870912,curtime:1700000000,mintime:1699999999,coinbasevalue:312500000,transactions:[],rules:['segwit']}
}

test('Bitcoin Core template becomes Nibiru mining job',async()=>{
  const getTemplate=templateAdapter({rpc:fakeRpc})
  const template=await getTemplate()
  const job=buildMiningJob({poolId:'npool-test',template})
  assert.equal(job.height,900000)
  assert.equal(job.templateId,template.templateId)
})

test('unverified share cannot enter production ledger',()=>{
  const job={jobId:'job-1',templateId:'tmpl-1',height:1}
  const submission=validateShareSubmission({job,workerId:'worker-1',nonce:'00000001',ntime:'00000002',extranonce2:'00000003',difficulty:1})
  assert.throws(()=>toProductionEvent({pool:{poolId:'pool-1'},job,share:submission}),/VERIFIED_SHARE_REQUIRED/)
})

test('confirmed block candidate credits sats only after chain confirmation',()=>{
  const job={jobId:'job-1',templateId:'tmpl-1',height:1}
  const submission=validateShareSubmission({job,workerId:'worker-1',nonce:'01',ntime:'02',extranonce2:'03',difficulty:1})
  const verified=classifyVerifiedShare(submission,{meetsShareTarget:true,meetsNetworkTarget:true,computedHash:'11'.repeat(32)})
  const event=toProductionEvent({pool:{poolId:'pool-1'},job,share:verified})
  assert.equal(generatorAttribution(event).sats,'0')
  const confirmed=confirmBlockProduction(event,{blockHash:'22'.repeat(32),confirmations:1,coinbaseValueSats:'312500000'})
  assert.equal(confirmed.btcProductionFinal,true)
  assert.equal(generatorAttribution(confirmed).sats,'312500000')
})
