import { createPersistentMissionRuntime } from '../server/neo-router/mission-runtime.mjs'
import { createUpstashStateStore } from '../server/neo-router/persistent-store.mjs'
import { createRedisLeaseManager } from '../server/neo-router/distributed-lease.mjs'
import { createRedisDeadLetterQueue } from '../server/neo-router/dead-letter.mjs'
import { createWorkerFleet } from '../server/neo-router/worker-fleet.mjs'
import { createLiveConnectorAgents } from '../server/neo-router/connector-agents.mjs'
import { reconcileMissionPlan } from '../server/neo-router/mission-planner.mjs'

const sharedStore=createUpstashStateStore()
const runtime=createPersistentMissionRuntime(sharedStore?{store:sharedStore}:{})
const hasRedis=Boolean(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN)
const leaseManager=hasRedis?createRedisLeaseManager():Object.freeze({
  mode:'github-actions-concurrency',durable:true,
  async acquire(){return true},async release(){return true},async inspect(){return null},
})
const deadLetter=createRedisDeadLetterQueue()
const adapters={
  ...createLiveConnectorAgents(),
  'router-housekeeping':async(action)=>({ok:true,type:action.type??'housekeeping',executedAt:new Date().toISOString()}),
}

const stateOwner=`router-worker-${process.env.GITHUB_RUN_ID||process.pid}`
const stateLocked=hasRedis?await leaseManager.acquire('mission-state',stateOwner,120000):true
if(!stateLocked)throw new Error('router_state_busy')
const result=await runtime.withEngine(async(engine)=>{
  const fleet=createWorkerFleet({engine,adapters,leaseManager,deadLetter})
  const executions=await fleet.tick()
  const plans=engine.list({status:'running'}).filter(m=>m.provenance?.includes('planner:v6')).map(m=>reconcileMissionPlan(engine,m.id))
  return {workers:fleet.describe(),executions,plans,persistence:runtime.store.mode,leaseMode:leaseManager.mode,deadLetterMode:deadLetter.mode}
})
if(hasRedis)await leaseManager.release('mission-state',stateOwner)

console.log(JSON.stringify({worker:'neo-router-v6-live-agent-fleet',result},null,2))
