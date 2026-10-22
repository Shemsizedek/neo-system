import http from 'node:http'
import policy from '../../architecture/neo-state-fabric-policy.json' with {type:'json'}
import {buildStateFabricSnapshot,evaluateMigrationReadiness,nextMigrationMode} from './fabric.mjs'

const PORT=Number(process.env.PORT||8803)
const TOKEN=String(process.env.NEO_STATE_OPERATOR_TOKEN||'')
let mode=String(process.env.NEO_STATE_MODE||'FIRESTORE_PRIMARY')
const namespaces=new Set()
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}

export function createStateServer(){
  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url||'/','http://neo.local')
      if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-state-fabric',mode})
      if(req.method==='GET'&&url.pathname==='/v1/estate/state')return json(res,200,buildStateFabricSnapshot({mode,namespaces:[...namespaces]}))
      if(!auth(req))return json(res,401,{error:'operator_auth_required'})
      if(req.method==='POST'&&url.pathname==='/v1/migration/evaluate'){
        const input=await body(req)
        const readiness=evaluateMigrationReadiness({
          mode,
          comparisons:Array.isArray(input.comparisons)?input.comparisons:[],
          backupVerified:input.backup_verified===true,
          replicaHealthy:input.replica_healthy===true,
          rollbackReady:input.rollback_ready===true
        })
        return json(res,200,{readiness,next:nextMigrationMode({current:mode,readiness,approved:false})})
      }
      if(req.method==='POST'&&url.pathname==='/v1/migration/transition'){
        const input=await body(req)
        const readiness=evaluateMigrationReadiness({
          mode,
          comparisons:Array.isArray(input.comparisons)?input.comparisons:[],
          backupVerified:input.backup_verified===true,
          replicaHealthy:input.replica_healthy===true,
          rollbackReady:input.rollback_ready===true
        })
        const decision=nextMigrationMode({current:mode,readiness,approved:input.approved===true})
        if(decision.changed)mode=decision.current
        return json(res,decision.changed?200:202,{mode,decision,readiness})
      }
      if(req.method==='POST'&&url.pathname==='/v1/namespaces'){
        const input=await body(req)
        if(!input.namespace)return json(res,400,{error:'namespace_required'})
        namespaces.add(String(input.namespace));return json(res,201,{namespace:String(input.namespace)})
      }
      return json(res,404,{error:'not_found'})
    }catch(error){return json(res,500,{error:'neo_state_error',detail:String(error?.message||error)})}
  })
}
if(import.meta.url===`file://${process.argv[1]}`)createStateServer().listen(PORT,'0.0.0.0')
