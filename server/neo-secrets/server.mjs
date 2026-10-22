import http from 'node:http'
import policy from '../../architecture/neo-secrets-fabric-policy.json' with {type:'json'}
import {createKeyRecord,createSecretLease,validateSecretLease,authorizeKeyUse,rotateKeyRecord,revokeKeyRecord,createRecoveryPlan,secretsSnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8802)
const TOKEN=String(process.env.NEO_SECRETS_OPERATOR_TOKEN||'')
const keys=new Map(),leases=new Map(),recoveryPlans=new Map()
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}

export function createSecretsServer(){
  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url||'/','http://neo.local')
      if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-secrets-fabric',keys:keys.size})
      if(req.method==='GET'&&url.pathname==='/v1/estate/secrets')return json(res,200,secretsSnapshot({keys:[...keys.values()],leases:[...leases.values()],recoveryPlans:[...recoveryPlans.values()]}))
      if(!auth(req))return json(res,401,{error:'operator_auth_required'})
      if(req.method==='POST'&&url.pathname==='/v1/keys'){
        const input=await body(req),record=createKeyRecord(input);keys.set(record.key_id,record);return json(res,201,{key:record})
      }
      if(req.method==='POST'&&url.pathname==='/v1/leases'){
        const input=await body(req),lease=createSecretLease({...input,maxTtlSeconds:policy.leases.max_ttl_seconds});leases.set(lease.lease_id,lease);return json(res,201,{lease})
      }
      if(req.method==='POST'&&url.pathname==='/v1/leases/validate'){
        const input=await body(req),lease=leases.get(input.lease_id);return json(res,200,validateSecretLease({lease,subject:input.subject,scope:input.scope}))
      }
      const use=url.pathname.match(/^\/v1\/keys\/([^/]+)\/authorize$/)
      if(req.method==='POST'&&use){
        const key=keys.get(decodeURIComponent(use[1]));if(!key)return json(res,404,{error:'key_not_found'})
        const input=await body(req);return json(res,200,authorizeKeyUse({keyRecord:key,policy,approvals:input.approvals||[],eligibleSigners:input.eligible_signers||[],purpose:input.purpose}))
      }
      const rotate=url.pathname.match(/^\/v1\/keys\/([^/]+)\/rotate$/)
      if(req.method==='POST'&&rotate){
        const current=keys.get(decodeURIComponent(rotate[1]));if(!current)return json(res,404,{error:'key_not_found'})
        const input=await body(req),pair=rotateKeyRecord({current,newKeyId:input.new_key_id,provider:input.provider,hardwareBacked:input.hardware_backed});keys.set(pair.previous.key_id,pair.previous);keys.set(pair.next.key_id,pair.next);return json(res,200,pair)
      }
      const revoke=url.pathname.match(/^\/v1\/keys\/([^/]+)\/revoke$/)
      if(req.method==='POST'&&revoke){
        const current=keys.get(decodeURIComponent(revoke[1]));if(!current)return json(res,404,{error:'key_not_found'})
        const input=await body(req),next=revokeKeyRecord({keyRecord:current,reason:input.reason});keys.set(next.key_id,next);return json(res,200,{key:next})
      }
      if(req.method==='POST'&&url.pathname==='/v1/recovery/plans'){
        const input=await body(req),plan=createRecoveryPlan(input);recoveryPlans.set(plan.recovery_id,plan);return json(res,201,{plan})
      }
      return json(res,404,{error:'not_found'})
    }catch(error){return json(res,500,{error:'neo_secrets_error',detail:String(error?.message||error)})}
  })
}
if(import.meta.url===`file://${process.argv[1]}`)createSecretsServer().listen(PORT,'0.0.0.0')
