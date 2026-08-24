import { timingSafeEqual } from 'node:crypto'
import { createPersistentMissionRuntime } from '../server/neo-router/mission-runtime.mjs'
import { MISSION_STATUS } from '../server/neo-router/mission-engine.mjs'

const runtime=createPersistentMissionRuntime()
function authorized(req){
  const expected=process.env.NEO_ROUTER_CONTROL_TOKEN
  const supplied=(req.headers.authorization||'').replace(/^Bearer\s+/i,'')
  if(!expected||!supplied)return false
  const a=Buffer.from(expected),b=Buffer.from(supplied)
  return a.length===b.length&&timingSafeEqual(a,b)
}

export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'method_not_allowed'})}
  if(!runtime.store.durable)return res.status(503).json({error:'persistent_store_required',required:['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN']})
  if(!authorized(req))return res.status(401).json({error:'unauthorized'})
  const body=req.body||{}
  try{
    const result=await runtime.withEngine(engine=>{
      switch(body.operation){
        case 'queue': return engine.queue(body.mission)
        case 'prepare': return engine.prepare(body.missionId)
        case 'transition': return engine.transition(body.missionId,body.status,body.detail||{})
        case 'retry': return engine.scheduleRetry(body.missionId,body.error)
        case 'release_retries': return engine.releaseRetries(body.at)
        case 'refresh_dependencies': return engine.refreshBlocked()
        case 'request_approval': return engine.requestApproval(body.missionId,body.action,body.context||{})
        case 'decide_approval': return engine.decideApproval(body.approvalId,body.decision,body.actor||'authorized-human')
        case 'heartbeat': return engine.heartbeat(body.connectorId,body.state,body.detail||{})
        default: throw new TypeError('unsupported operation')
      }
    })
    return res.status(200).json({ok:true,result})
  }catch(error){
    return res.status(400).json({ok:false,error:error.message,validStatuses:Object.values(MISSION_STATUS)})
  }
}
