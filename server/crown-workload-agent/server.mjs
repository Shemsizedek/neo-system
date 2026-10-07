import http from 'node:http'
import {workloadIdentity,signCrownInput} from './identity.mjs'

const port=Number(process.env.PORT||8080)
const crown=(process.env.CROWN_ORIGIN||'https://crown.holytemples.org').replace(/\/$/,'')
const privatePem=process.env.CROWN_WORKLOAD_PRIVATE_KEY||''
const operatorToken=(process.env.CROWN_WORKLOAD_OPERATOR_TOKEN||'').trim()
const serviceId=process.env.CROWN_SERVICE_ID||''
const keyId=process.env.CROWN_KEY_ID||''
if(!privatePem||!operatorToken||!serviceId||!keyId)throw new Error('CROWN workload configuration incomplete')
const identity=workloadIdentity(privatePem,serviceId,keyId)
const json=(res,status,body)=>{const data=Buffer.from(JSON.stringify(body));res.writeHead(status,{'content-type':'application/json','content-length':data.length,'cache-control':'no-store'});res.end(data)}
const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>65536)throw new Error('request too large')}return raw?JSON.parse(raw):{}}
const authorized=req=>req.headers.authorization===`Bearer ${operatorToken}`
const post=async(path,payload)=>{const r=await fetch(`${crown}${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)throw new Error(j.error||`Crown HTTP ${r.status}`);return j}

async function prove(scopes=['crown.api.read']){
  const challenge=await post('/api/v1/trust/challenge',{service_id:serviceId,key_id:keyId,scopes})
  const signature=signCrownInput(privatePem,challenge.signing_input)
  const issued=await post('/api/v1/trust/token',{ceremony:challenge.ceremony,signature})
  const verified=await post('/api/v1/trust/verify',{authorization:issued.authorization,required_scope:scopes[0]||''})
  return{gate:'CROWN-031',service_id:serviceId,key_id:keyId,verified:verified.valid===true,scopes:issued.scopes,expires_in:issued.expires_in,token_exposed:false,private_key_exposed:false}
}

const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost')
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{service_id:serviceId,status:'UP',crownWorkloadIdentity:'READY'})
  if(req.method==='GET'&&url.pathname==='/crown/identity')return json(res,200,identity)
  if(req.method==='POST'&&url.pathname==='/crown/enroll-request'){
    if(!authorized(req))return json(res,401,{error:'UNAUTHORIZED'})
    return json(res,200,await post('/api/v1/trust/service-key/request',{service_id:serviceId,key_id:keyId,public_key:identity.public_key}))
  }
  if(req.method==='POST'&&url.pathname==='/crown/prove'){
    if(!authorized(req))return json(res,401,{error:'UNAUTHORIZED'})
    const input=await body(req),scopes=Array.isArray(input.scopes)?input.scopes:['crown.api.read']
    return json(res,200,await prove(scopes))
  }
  return json(res,404,{error:'NOT_FOUND'})
}catch(error){return json(res,502,{error:'CROWN_WORKLOAD_FLOW_FAILED',message:error.message})}})
server.listen(port,()=>console.log(JSON.stringify({event:'started',service_id:serviceId,key_id:keyId,port})))
