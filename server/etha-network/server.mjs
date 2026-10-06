import http from 'node:http'
import {SERVICE_ID,KEY_ID,workloadIdentity,signCrownInput} from './identity.mjs'

const port=Number(process.env.PORT||8080),crown=(process.env.CROWN_ORIGIN||'https://crown.holytemples.org').replace(/\/$/,'')
const privatePem=process.env.ETHA_CROWN_PRIVATE_KEY||'',operatorToken=process.env.ETHA_OPERATOR_TOKEN||''
if(!privatePem)throw new Error('ETHA_CROWN_PRIVATE_KEY is required')
const identity=workloadIdentity(privatePem)
const json=(res,status,body)=>{const data=Buffer.from(JSON.stringify(body));res.writeHead(status,{'content-type':'application/json','content-length':data.length,'cache-control':'no-store'});res.end(data)}
const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>65536)throw new Error('request too large')}return raw?JSON.parse(raw):{}}
const authorized=req=>operatorToken&&req.headers.authorization===`Bearer ${operatorToken}`
const post=async(path,payload)=>{const r=await fetch(`${crown}${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)throw new Error(j.error||`Crown HTTP ${r.status}`);return j}

const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost')
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{service:'etha-network',status:'UP',crownWorkloadIdentity:'READY',bitcoinCustody:false})
  if(req.method==='GET'&&url.pathname==='/crown/identity')return json(res,200,identity)
  if(req.method==='POST'&&url.pathname==='/crown/enroll-request'){
    if(!authorized(req))return json(res,401,{error:'UNAUTHORIZED'})
    return json(res,200,await post('/api/v1/trust/service-key/request',{service_id:SERVICE_ID,key_id:KEY_ID,public_key:identity.public_key}))
  }
  if(req.method==='POST'&&url.pathname==='/crown/prove'){
    if(!authorized(req))return json(res,401,{error:'UNAUTHORIZED'})
    const input=await body(req),scopes=Array.isArray(input.scopes)?input.scopes:['crown.api.read']
    const challenge=await post('/api/v1/trust/challenge',{service_id:SERVICE_ID,key_id:KEY_ID,scopes})
    const signature=signCrownInput(privatePem,challenge.signing_input)
    const issued=await post('/api/v1/trust/token',{ceremony:challenge.ceremony,signature})
    const verified=await post('/api/v1/trust/verify',{authorization:issued.authorization,required_scope:scopes[0]||''})
    return json(res,200,{gate:'CROWN-027',service_id:SERVICE_ID,verified:verified.valid===true,scopes:issued.scopes,expires_in:issued.expires_in})
  }
  return json(res,404,{error:'NOT_FOUND'})
}catch(error){return json(res,502,{error:'CROWN_WORKLOAD_FLOW_FAILED',message:error.message})}})
server.listen(port,()=>console.log(JSON.stringify({service:'etha-network',event:'started',port,keyId:KEY_ID})))
