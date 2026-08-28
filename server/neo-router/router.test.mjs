import assert from 'node:assert/strict'
import test from 'node:test'
import { createNeoRouter } from './router.mjs'

const provider = (id, { configured = true, fail = false } = {}) => ({
  id,
  configured,
  async invoke() {
    if (fail) throw new Error(`${id} unavailable`)
    return { provider: id, text: `${id} response` }
  },
})

test('routes orchestration to Claude first', async () => {
  const router = createNeoRouter({ providers: [provider('anthropic'), provider('openai'), provider('gemini')] })
  const result = await router.execute({ missionId: 'M-1', objective: 'Coordinate work', capability: 'orchestration' })
  assert.equal(result.status, 'completed')
  assert.equal(result.route, 'anthropic')
})

test('falls back without changing the mission', async () => {
  const router = createNeoRouter({ providers: [provider('anthropic', { fail: true }), provider('openai'), provider('gemini')] })
  const result = await router.execute({ missionId: 'M-2', objective: 'Coordinate work', capability: 'orchestration' })
  assert.equal(result.route, 'openai')
  assert.deepEqual(result.failures, [{ provider: 'anthropic', message: 'anthropic unavailable' }])
})

test('stops sensitive work at a human approval checkpoint', async () => {
  const router = createNeoRouter({ providers: [provider('anthropic')] })
  const result = await router.execute({
    missionId: 'M-3', objective: 'Deploy the system', capability: 'orchestration', actions: ['production_deployment'],
  })
  assert.equal(result.status, 'awaiting_approval')
})

test('routes frontend work to Gemini first', async () => {
  const router = createNeoRouter({ providers: [provider('anthropic'), provider('openai'), provider('gemini')] })
  const result = await router.execute({ missionId: 'M-4', objective: 'Build interface', capability: 'frontend' })
  assert.equal(result.route, 'gemini')
})

test('exposes both cyclical tesseract perspectives', () => {
  const router = createNeoRouter({ providers: [provider('anthropic')] })
  const plan = router.plan({ missionId: 'M-5', objective: 'Review foundations', capability: 'reasoning' })
  assert.deepEqual(plan.doctrine.tesseract.humanAscent, [777, 888, 999])
  assert.deepEqual(plan.doctrine.tesseract.angelicDescent, [999, 888, 777])
  assert.equal(plan.doctrine.tesseract.behavior, 'cyclical_restart')
})

test('requires guarded experimental handling for future psitronic interfaces', () => {
  const router = createNeoRouter({ providers: [provider('anthropic')] })
  const plan = router.plan({ missionId: 'M-6', objective: 'Assess an emerging device', capability: 'reasoning' })
  assert.equal(plan.emergingInterfaces.maturity, 'experimental_unverified')
  assert.ok(plan.emergingInterfaces.surfaces.includes('internet_of_things'))
  assert.ok(plan.emergingInterfaces.requiredControls.includes('local_kill_switch'))
  assert.ok(plan.emergingInterfaces.requiredControls.includes('human_approval_for_actuation'))
})

test('routes edge and IoT work to Workers AI first', async () => {
  const router = createNeoRouter({ providers: [provider('cloudflare'), provider('openai')] })
  const result = await router.execute({ missionId: 'M-7', objective: 'Process device telemetry', capability: 'internet-of-things' })
  assert.equal(result.route, 'cloudflare')
})

test('honors mission provider preference and exclusion without bypassing configuration', () => {
  const router = createNeoRouter({ providers: [provider('anthropic'), provider('openai'), provider('gemini')] })
  const plan = router.plan({ missionId: 'M-8', objective: 'Review implementation', capability: 'review', preferredProviders: ['gemini'], excludedProviders: ['openai'] })
  assert.deepEqual(plan.candidates, ['gemini', 'anthropic'])
})

test('reports provider mesh readiness without exposing credentials', () => {
  const router = createNeoRouter({ providers: [provider('anthropic'), provider('cloudflare', { configured: false })] })
  assert.deepEqual(router.health().configured, ['anthropic'])
  assert.equal(router.health().providers[1].configured, false)
})
