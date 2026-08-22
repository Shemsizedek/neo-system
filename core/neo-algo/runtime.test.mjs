import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyRisk, cycleOrder, runNeoAlgo } from './runtime.mjs'

test('uses the human 777-888-999 cycle by default', () => {
  const result = runNeoAlgo({ missionId: 'A-1', objective: 'Analyze a project' })
  assert.deepEqual(result.stages.map((stage) => stage.stage), [777, 888, 999])
  assert.equal(result.risk, 'green')
  assert.equal(result.approvalRequired, false)
})

test('supports the angelic 999-888-777 reverse-review cycle', () => {
  assert.deepEqual(cycleOrder('angelic'), [999, 888, 777])
  const result = runNeoAlgo({ missionId: 'A-2', objective: 'Reverse audit a recommendation' }, 'angelic')
  assert.deepEqual(result.stages.map((stage) => stage.stage), [999, 888, 777])
})

test('classifies communication and publish writes as yellow', () => {
  assert.equal(classifyRisk({ actions: ['send_communication'] }), 'yellow')
  assert.equal(classifyRisk({ requestedAction: 'publish' }), 'yellow')
})

test('classifies financial, legal, destructive, and consequential actions as red', () => {
  assert.equal(classifyRisk({ actions: ['financial_transfer'] }), 'red')
  assert.equal(classifyRisk({ requestedAction: 'contract_execution' }), 'red')
  assert.equal(classifyRisk({ consequential: true }), 'red')
})

test('rejects malformed missions and invalid cycle names', () => {
  assert.throws(() => runNeoAlgo({ objective: 'Missing id' }), /mission id and objective are required/)
  assert.throws(() => cycleOrder('sideways'), /cycle must be human or angelic/)
})
