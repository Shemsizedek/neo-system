import http from 'node:http'
import policy from '../../architecture/neo-continuity-fabric-policy.json' with {type:'json'}
import {createBackupRecord,verifyBackupRecord,recordRestoreVerification,evaluateEstateContinuity,createDrExercise,estateContinuitySnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8804)
const TOKEN=String(process.env.NEO_CONTINUITY_OPERATOR_TOKEN||'')
const backups=new Map(),results=new Map(),exercises=[]
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}

export function createContinuityServer(){return http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/','http://neo.local')
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-continuity',backups:backups.size})
  if(req.method==='GET'&&url.pathname==='/v1/estate/continuity')return json(res,200,estateContinuitySnapshot({serviceResults:[...results.values()],exercises}))
  if(!auth(req))return json(res,401,{error:'operator_auth_required'})
  if(req.method==='POST'&&url.pathname==='/v1/backups'){
   const input=await body(req);let b=createBackupRecord(input);if(input.expected_digest)b=verifyBackupRecord(b,{expectedDigest:input.expected_digest});if(input.restore_digest)b=recordRestoreVerification({backup:b,restoredDigest:input.restore_digest,integrityOk:input.integrity_ok===true});backups.set(b.id,b);return json(res,201,{backup:b})
  }
  if(req.method==='POST'&&url.pathname==='/v1/readiness'){
   const input=await body(req),b=backups.get(input.backup_id);if(!b)return json(res,404,{error:'backup_not_found'});const r=evaluateEstateContinuity({service:input.service,criticality:input.criticality||'high',policy,backup:b,replicaHealth:input.replica_health||'unknown'});results.set(r.service,r);return json(res,200,r)
  }
  if(req.method==='POST'&&url.pathname==='/v1/exercises'){
   const input=await body(req),selected=(input.services||[]).map(s=>results.get(s)).filter(Boolean),ex=createDrExercise({id:input.id||`DR-${Date.now()}`,scenario:input.scenario||'continuity exercise',serviceResults:selected});exercises.push(ex);return json(res,201,ex)
  }
  return json(res,404,{error:'not_found'})
 }catch(error){return json(res,500,{error:'neo_continuity_error',detail:String(error?.message||error)})}
})}
if(import.meta.url===`file://${process.argv[1]}`)createContinuityServer().listen(PORT,'0.0.0.0')
