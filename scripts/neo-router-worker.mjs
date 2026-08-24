import { createPersistentMissionRuntime } from '../server/neo-router/mission-runtime.mjs'
import { createWorkerRuntime } from '../server/neo-router/worker-runtime.mjs'

const runtime = createPersistentMissionRuntime()
const adapters = {
  'router-housekeeping': async (action) => ({ ok:true, type:action.type ?? 'housekeeping', executedAt:new Date().toISOString() }),
}

const result = await runtime.withEngine(async (engine) => {
  const worker = createWorkerRuntime({
    engine,
    adapters,
    workerId: process.env.NEO_ROUTER_WORKER_ID ?? 'github-actions-worker',
    concurrency: Number(process.env.NEO_ROUTER_WORKER_CONCURRENCY ?? 2),
  })
  return worker.tick()
})

console.log(JSON.stringify({ worker:'neo-router-v4', result }, null, 2))
