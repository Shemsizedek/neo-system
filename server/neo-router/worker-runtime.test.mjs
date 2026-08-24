import test from 'node:test'
import assert from 'node:assert/strict'
import { createMissionEngine } from './mission-engine.mjs'
import { createWorkerRuntime, createLeaseManager } from './worker-runtime.mjs'

test('worker executes a queued mission through a registered adapter', async () => {
  const engine = createMissionEngine()
  engine.queue({ id:'M1', objective:'read repo', actions:[{connector:'github',type:'read'}] })
  const worker = createWorkerRuntime({ engine, adapters:{github: async()=>({ok:true})} })
  const result = await worker.tick()
  assert.equal(result[0].completed, true)
  assert.equal(engine.get('M1').status, 'completed')
})

test('worker stops for approval before high-impact action', async () => {
  const engine = createMissionEngine()
  engine.queue({ id:'M2', objective:'merge', actions:[{connector:'github',type:'merge',approvalRequired:true}] })
  const worker = createWorkerRuntime({ engine, adapters:{} })
  const result = await worker.tick()
  assert.ok(result[0].awaitingApproval)
  assert.equal(engine.get('M2').status, 'awaiting_approval')
})

test('lease prevents two workers owning one mission at once', () => {
  const leases = createLeaseManager({ clock:()=>1000 })
  assert.equal(leases.acquire('M3','w1',1000), true)
  assert.equal(leases.acquire('M3','w2',1000), false)
  assert.equal(leases.release('M3','w1'), true)
})
