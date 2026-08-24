import { createPersistentMissionRuntime } from '../server/neo-router/mission-runtime.mjs'
import { createRedisEventStore, ingestRouterEvent } from '../server/neo-router/event-engine.mjs'
import { normalizeInboundEvent, verifyBearer, verifyGitHubSignature } from '../server/neo-router/event-security.mjs'

export const config={api:{bodyParser:false}}
const runtime=createPersistentMissionRuntime()
const store=createRedisEventStore()
async function readBody(req){const chunks=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const raw=Buffer.concat(chunks).toString('utf8');let body={};try{body=raw?JSON.parse(raw):{}}catch{throw new Error('invalid_json')}return {raw,body}}
function header(req,name){return req.headers?.[name.toLowerCase()]??req.headers?.[name]}
function authorized(source,req,raw){
  if(source==='github')return verifyGitHubSignature(raw,header(req,'x-hub-signature-256'),process.env.NEO_ROUTER_GITHUB_WEBHOOK_SECRET)
  return verifyBearer(header(req,'authorization'),process.env.NEO_ROUTER_EVENT_TOKEN)
}
export default async function handler(req,res){
  if(req.method==='GET'){
    res.setHeader('Cache-Control','no-store')
    return res.status(200).json({events:await store.list(100),eventStore:{mode:store.mode,durable:store.durable}})
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'method_not_allowed'})}
  try{
    const source=String(req.query?.source??header(req,'x-neo-event-source')??'').toLowerCase()
    if(!['github','asana','gmail','airbyte'].includes(source))return res.status(400).json({error:'unsupported_event_source'})
    const {raw,body}=await readBody(req)
    if(!authorized(source,req,raw))return res.status(401).json({error:'unauthorized_event'})
    if(!runtime.store.durable||!store.durable)return res.status(503).json({error:'durable_event_operations_not_configured'})
    const event=normalizeInboundEvent({source,headers:req.headers,body,rawBody:raw})
    const result=await ingestRouterEvent({event,store,runtime})
    return res.status(result.duplicate?200:202).json(result)
  }catch(error){return res.status(400).json({error:error instanceof Error?error.message:String(error)})}
}
