import test from 'node:test'
import assert from 'node:assert/strict'
import {createEnrollmentChallenge,verifyEnrollmentChallenge,enrollMiner,registerTelemetry,verifyStratumShare,applyShareResult,accountingEligibleShare,fleetSnapshot} from './fleet.mjs'

test('miner enrollment requires verified identity challenge',()=>{
  const ch=createEnrollmentChallenge({minerId:'M1',publicKey:'PUB'})
  assert.throws(()=>enrollMiner({challenge:ch}),/VERIFIED_CHALLENGE_REQUIRED/)
  const verified=verifyEnrollmentChallenge(ch,{signature:'sig',verifySignature:()=>true})
  const miner=enrollMiner({challenge:verified,model:'ASIC-X'})
  assert.equal(miner.trust,'VERIFIED_IDENTITY')
})

test('only online verified miner shares with accepted pool receipt are accounting eligible',()=>{
  const ch=verifyEnrollmentChallenge(createEnrollmentChallenge({minerId:'M1',publicKey:'PUB'}),{signature:'sig',verifySignature:()=>true})
  const miner=registerTelemetry(enrollMiner({challenge:ch}),{hashrateTh:120,powerW:3200,temperatureC:68,poolConnected:true})
  const result=verifyStratumShare({miner,share:{shareId:'S1',minerId:'M1',difficulty:10,simulation:false},poolReceipt:{shareId:'S1',poolId:'P1',accepted:true,receivedAt:new Date().toISOString()}})
  assert.equal(accountingEligibleShare(result),true)
  assert.equal(applyShareResult(miner,result).shareStats.verified,1)
})

test('simulation shares never reach customer accounting',()=>{
  const ch=verifyEnrollmentChallenge(createEnrollmentChallenge({minerId:'M1',publicKey:'PUB'}),{signature:'sig',verifySignature:()=>true})
  const miner=registerTelemetry(enrollMiner({challenge:ch}),{hashrateTh:100,poolConnected:true})
  assert.throws(()=>verifyStratumShare({miner,share:{shareId:'S1',minerId:'M1',simulation:true},poolReceipt:{shareId:'S1',poolId:'P1',accepted:true,receivedAt:new Date().toISOString()}}),/SIMULATION_SHARE_BLOCKED/)
})

test('fleet snapshot totals online verified hashrate and shares',()=>{
  const ch=verifyEnrollmentChallenge(createEnrollmentChallenge({minerId:'M1',publicKey:'PUB'}),{signature:'sig',verifySignature:()=>true})
  const miner=registerTelemetry(enrollMiner({challenge:ch}),{hashrateTh:100})
  const updated=applyShareResult(miner,{accepted:true,verified:true})
  const snap=fleetSnapshot([updated])
  assert.equal(snap.totalHashrateTh,100)
  assert.equal(snap.verifiedShares,1)
})
