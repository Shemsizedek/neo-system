import { createPersistentMissionRuntime } from '../server/neo-router/mission-runtime.mjs'
import { createRedisLeaseManager } from '../server/neo-router/distributed-lease.mjs'
import { createRedisDeadLetterQueue } from '../server/neo-router/dead-letter.mjs'
import { createWorkerFleet } from '../server/neo-router/worker-fleet.mjs'

const runtime = createPersistentMissionRuntime()
if (!runtime.store.durable) {
  console.error('NEO Router worker fleet refused to run: durable mission storage is not configured.')
  process.exit(2)
}

const leaseManager=createRedisLeaseManager()
const deadLetter=createRedisDeadLetterQueue()
const adapters = {
  'router-housekeeping': async (action) => ({ ok:true, type:action.type ?? 'housekeeping', executedAt:new Date().toISOString() }),
}

const result = await runtime.withEngine(async (engine) => {
  const fleet=createWorkerFleet({engine,adapters,leaseManager,deadLetter})
  const executions=await fleet.tick()
  return {workers:fleet.describe(),executions,deadLetterMode:deadLetter.mode}
})

console.log(JSON.stringify({ worker:'neo-router-v5-fleet', result }, null, 2))
