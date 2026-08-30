import test from 'node:test'
import assert from 'node:assert/strict'
import {decimalRatio,divideTargetByDifficulty,targetFromCompactBits} from './protocolMath.mjs'
import {DIFF1_TARGET,doubleSha256Hex,targetFromDifficulty,verifyHeaderTargets} from './shareTarget.mjs'

const GENESIS_HEADER='01000000'+'00'.repeat(32)+'3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a'+'29ab5f49'+'ffff001d'+'1dac2b7c'
const GENESIS_HASH='000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'

test('decimal difficulty is represented exactly as an integer ratio',()=>{
  assert.deepEqual(decimalRatio('1.5'),{numerator:15n,denominator:10n})
  assert.deepEqual(decimalRatio('2.5e2'),{numerator:250n,denominator:1n})
})

test('fractional difficulty does not floor to an integer',()=>{
  assert.equal(targetFromDifficulty('1.5'),(DIFF1_TARGET*10n)/15n)
  assert.equal(divideTargetByDifficulty(DIFF1_TARGET,'0.5'),DIFF1_TARGET*2n)
})

test('compact bits 1d00ffff decodes to Bitcoin difficulty-one target',()=>{
  assert.equal(targetFromCompactBits('1d00ffff'),DIFF1_TARGET)
})

test('Bitcoin genesis header hashes to the known block hash',()=>{
  assert.equal(doubleSha256Hex(GENESIS_HEADER),GENESIS_HASH)
})

test('Bitcoin genesis header satisfies its network target',()=>{
  const verified=verifyHeaderTargets({headerHex:GENESIS_HEADER,difficulty:'1',bits:'1d00ffff'})
  assert.equal(verified.computedHash,GENESIS_HASH)
  assert.equal(verified.meetsNetworkTarget,true)
  assert.equal(verified.meetsShareTarget,true)
})

test('compact target rejects negative and zero mantissas',()=>{
  assert.throws(()=>targetFromCompactBits('1d80ffff'),/INVALID_BITS/)
  assert.throws(()=>targetFromCompactBits('1d000000'),/INVALID_BITS/)
})
