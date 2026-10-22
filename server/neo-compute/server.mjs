import http from 'node:http'
import crypto from 'node:crypto'
import {createEnrollmentChallenge,buildAttestationPayload,verifyEnrollmentAttestation,createNodeRecord,applyHeartbeat,scheduleWorkload,publicEstateSnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8798)
const OPERATOR_TOKEN=String(process.env.NEO_COMPUTE_OPERATOR_TOKEN||'')
const challenges=new Map(),nodes=new Map()

const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
const auth=req=>OPERATOR_TOKEN&&String(req.headers.authorization||'')===`Bearer ${OPERATOR_TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}

export function createComputeServer(){
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||'/','http://neo.local')
   if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-compute-fabric',nodes:nodes.size})
   if(req.method==='GET'&&url.pathname==='/v1/estate')return json(res,200,publicEstateSnapshot({nodes:[...nodes.values()]}))
   if(req.method==='POST'&&url.pathname==='/v1/nodes/challenge'){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const input=await body(req),challenge=createEnrollmentChallenge({nodeId:input.node_id})
    challenges.set(challenge.challenge_id,challenge);return json(res,201,challenge)
   }
   if(req.method==='POST'&&url.pathname==='/v1/nodes/enroll'){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const input=await body(req),challenge=challenges.get(input.challenge_id)
    if(!challenge)return json(res,404,{error:'challenge_not_found'})
    const payload=buildAttestationPayload({challenge,hardware:input.hardware,capacity:input.capacity,network:input.network,agentVersion:input.agent_version})
    let publicKey
    try{publicKey=crypto.createPublicKey(input.public_key_pem)}catch{return json(res,400,{error:'invalid_public_key'})}
    const verified=verifyEnrollmentAttestation({challenge,payload,signature:input.signature,publicKey})
    if(!verified.valid)return json(res,403,{error:'attestation_failed',reason:verified.reason})
    challenge.consumed=true
    const fingerprint=crypto.createHash('sha256').update(input.public_key_pem).digest('hex')
    const node=createNodeRecord({payload,publicKeyFingerprint:fingerprint});nodes.set(node.node_id,node)
    return json(res,201,{ok:true,node})
   }
   const hb=url.pathname.match(/^\/v1\/nodes\/([^/]+)\/heartbeat$/)
   if(req.method==='POST'&&hb){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const node=nodes.get(decodeURIComponent(hb[1]));if(!node)return json(res,404,{error:'node_not_found'})
    const input=await body(req),next=applyHeartbeat(node,input);nodes.set(next.node_id,next);return json(res,200,{ok:true,node:next})
   }
   if(req.method==='POST'&&url.pathname==='/v1/schedule'){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const input=await body(req),placement=scheduleWorkload({workload:input.workload,nodes:[...nodes.values()],production:input.production===true,approved:input.approved===true})
    return json(res,placement.status==='AWAITING_APPROVAL'?202:200,placement)
   }
   if(req.method==='GET'&&url.pathname==='/v1/nodes'){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    return json(res,200,{nodes:[...nodes.values()]})
   }
   return json(res,404,{error:'not_found'})
  }catch(error){return json(res,500,{error:'neo_compute_error',detail:String(error?.message||error)})}
 })
}

if(import.meta.url===`file://${process.argv[1]}`)createComputeServer().listen(PORT,'0.0.0.0')
