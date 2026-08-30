import { createPersistentMissionRuntime } from '../server/neo-router/mission-runtime.mjs'
import { runtimeBindingHealth } from '../server/neo-router/runtime-bindings.mjs'
import { createRedisEventStore } from '../server/neo-router/event-engine.mjs'
import { buildOperationsCommandCenter } from '../server/neo-router/operations-command-center.mjs'
import { createNeoRouter } from '../server/neo-router/router.mjs'
import { providersFromEnv } from '../server/neo-router/providers.mjs'

const runtime=createPersistentMissionRuntime()
const eventStore=createRedisEventStore()
const router=createNeoRouter({providers:providersFromEnv(process.env)})

async function initialize(){
  await runtime.withEngine(engine=>{
    if(!engine.get('NEO-ROUTER-MISSION-001')){
      engine.queue({id:'NEO-ROUTER-MISSION-001',objective:'Triage and safely rebase stale neo-system pull requests, rerun CI, preserve provenance, and stop at approval gates before consequential merges.',priority:'high',route:['github-native','asana-native','airbyte-agent-engine'],provenance:['github:Shemsizedek/neo-system','asana:1217756114723188']})
      engine.prepare('NEO-ROUTER-MISSION-001')
      engine.heartbeat('github-native','healthy',{role:'primary_software_system_of_record'})
      engine.heartbeat('asana-native','healthy',{role:'mission_execution_tracker'})
      engine.heartbeat('airbyte-agent-engine','degraded',{reason:'schema_discovery_error',fallback:'native_connectors'})
      const bindings=runtimeBindingHealth(process.env)
      for(const binding of Object.values(bindings.bindings)) engine.heartbeat(binding.connector,binding.bound?'bound':'unbound',{envKey:binding.envKey})
    }
  })
}

export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'read_only_endpoint'})}
  await initialize()
  res.setHeader('Cache-Control','no-store')
  const telemetry=await runtime.telemetry({eventLimit:50})
  const inboundEvents=await eventStore.list(50)
  const routerHealth=router.health()
  const command=buildOperationsCommandCenter({telemetry,inboundEvents,routerHealth})
  return res.status(200).json({...telemetry,inboundEvents,eventStore:{mode:eventStore.mode,durable:eventStore.durable},routerHealth,command})
}
