import { createWorkerRuntime } from './worker-runtime.mjs'

export const DEFAULT_WORKER_PROFILES=Object.freeze([
  {id:'neo-github-worker',role:'software',capabilities:['github.read','github.write','ci.inspect'],concurrency:2},
  {id:'neo-asana-worker',role:'operations',capabilities:['asana.read','asana.write'],concurrency:2},
  {id:'neo-gmail-worker',role:'communications',capabilities:['gmail.read','gmail.draft'],concurrency:1},
  {id:'neo-airbyte-worker',role:'integration',capabilities:['airbyte.read','airbyte.execute'],concurrency:2},
  {id:'neo-general-worker',role:'general',capabilities:[],concurrency:1},
])

export function createWorkerFleet({engine,adapters={},profiles=DEFAULT_WORKER_PROFILES,leaseManager,deadLetter}={}){
  if(!engine)throw new TypeError('engine is required')
  const workers=profiles.map(p=>createWorkerRuntime({engine,adapters,workerId:p.id,role:p.role,capabilities:p.capabilities,concurrency:p.concurrency,leaseManager,deadLetter}))
  async function tick(){const batches=await Promise.all(workers.map(w=>w.tick()));return batches.flat()}
  function describe(){return workers.map(w=>({workerId:w.workerId,role:w.role,capabilities:w.capabilities,leaseMode:w.leaseMode,active:w.activeCount()}))}
  return Object.freeze({tick,describe,workers})
}
