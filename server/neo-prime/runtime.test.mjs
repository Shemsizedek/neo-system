import assert from 'node:assert/strict'
import test from 'node:test'
import { createNeoRouter } from '../neo-router/router.mjs'
import { createNeoPrimeRuntime } from './runtime.mjs'

function provider(id) {
  return {
    id,
    configured: true,
    async invoke() {
      return { provider: id, text: `${id} response` }
    },
  }
}

function prime() {
  const router = createNeoRouter({ providers: [provider('anthropic'), provider('openai'), provider('gemini')] })
  return createNeoPrimeRuntime({ router })
}

test('green missions execute and include NEO Algo provenance', async () => {
  const result = await prime().execute({ missionId: 'P-1', objective: 'Analyze priorities', capability: 'reasoning' })
  assert.equal(result.status, 'completed')
  assert.equal(result.neoAlgo.risk, 'green')
  assert.ok(result.neoAlgo.provenance.includes('NEO-ALGO-001'))
})

test('yellow NEO Algo actions stop before provider execution without approval', async () => {
  const result = await prime().execute({
    missionId: 'P-2', objective: 'Send the prepared update', capability: 'orchestration', actions: ['send_communication'],
  })
  assert.equal(result.status, 'awaiting_approval')
  assert.equal(result.neoAlgo.risk, 'yellow')
  assert.equal(result.approvalRequired, true)
})

test('approved yellow actions may continue through the router', async () => {
  const result = await prime().execute({
    missionId: 'P-3', objective: 'Send the approved update', capability: 'orchestration', actions: ['send_communication'],
  }, { approved: true })
  assert.equal(result.status, 'completed')
  assert.equal(result.neoAlgo.risk, 'yellow')
})

test('red actions are blocked pending explicit human authorization', async () => {
  const result = await prime().execute({
    missionId: 'P-4', objective: 'Transfer funds', capability: 'reasoning', actions: ['financial_transfer'],
  })
  assert.equal(result.status, 'awaiting_approval')
  assert.equal(result.neoAlgo.risk, 'red')
})

test('Prime preserves existing router approval gates', async () => {
  const result = await prime().execute({
    missionId: 'P-5', objective: 'Deploy production', capability: 'orchestration', actions: ['production_deployment'],
  })
  assert.equal(result.status, 'awaiting_approval')
  assert.equal(result.approvalRequired, true)
})

test('Prime can run the angelic reverse-review cycle', () => {
  const result = prime().plan({ missionId: 'P-6', objective: 'Reverse review', capability: 'reasoning' }, { cycle: 'angelic' })
  assert.deepEqual(result.neoAlgo.stages.map((stage) => stage.stage), [999, 888, 777])
})
