import test from 'node:test'
import assert from 'node:assert/strict'
import {createWorkerCredential,authenticateWorker} from './workerAuth.mjs'
import {targetFromDifficulty,targetFromBits,hashMeetsTarget} from './shareTarget.mjs'

test('worker credential authenticates only correct pool worker and secret',()=>{
  const credential=createWorkerCredential({poolId:'pool-1',workerId:'worker-1',memberId:'member-1',secret:'0123456789abcdef'})
  assert.equal(authenticateWorker(credential,{poolId:'pool-1',workerId:'worker-1',secret:'0123456789abcdef'}),true)
  assert.equal(authenticateWorker(credential,{poolId:'pool-2',workerId:'worker-1',secret:'0123456789abcdef'}),false)
  assert.equal(authenticateWorker(credential,{poolId:'pool-1',workerId:'worker-1',secret:'wrong-wrong-wrong'}),false)
})

test('difficulty and compact bits targets are positive',()=>{
  assert.ok(targetFromDifficulty(1)>0n)
  assert.ok(targetFromDifficulty(1024)>0n)
  assert.ok(targetFromBits('1d00ffff')>0n)
})

test('hash target comparison rejects hashes above target',()=>{
  const tiny=1n
  assert.equal(hashMeetsTarget('f'.repeat(64),tiny),false)
})
