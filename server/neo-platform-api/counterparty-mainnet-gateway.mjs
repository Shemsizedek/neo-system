import {resolveNeoBitcoinCapability} from '../neo-vm/project-policy.mjs'
import {observeCounterpartyMainnet} from '../neo-vm/counterparty-mainnet.mjs'

// No transaction composition, private-key access, arbitrary URL, or RPC proxy.
const PATH='/api/v1/bitcoin/counterparty/mainnet'
const respond=(res,status,payload)=>{
  const body=JSON.stringify(payload)
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'content-security-policy':"default-src 'none'",
    'referrer-policy':'no-referrer','vary':'Authorization, Cookie'
  })
  res.end(body)
}
export function createCounterpartyMainnetGatewayHandler({
  enabled=false,allowedProjects=[],subjectResolver,authService=null,
  fetchImpl=fetch,audit=()=>{},now=()=>new Date().toISOString()
}={}){
  const configured=Array.isArray(allowedProjects)?allowedProjects:[]
  const allowed=new Set(configured.filter(x=>typeof x==='string'&&/^[a-z0-9-]{1,64}$/.test(x)))
  return async function handle(req,res,url){
    if(url.pathname!==PATH)return false
    if(!enabled){respond(res,404,{error:'not_found'});return true}
    if(req.method!=='GET'){respond(res,405,{error:'method_not_allowed'});return true}
    if(req.headers['sec-fetch-site']==='cross-site'){
      respond(res,403,{error:'cross_site_request_blocked'});return true
    }
    if(typeof subjectResolver!=='function'||typeof authService?.session!=='function'){
      respond(res,503,{error:'neopass_auth_unavailable'});return true
    }
    const subject=subjectResolver(req)
    if(typeof subject!=='string'||!subject){
      respond(res,401,{error:'neopass_identity_required'});return true
    }
    let member
    try{member=await authService.session(subject,req.neopassClaims||{})}
    catch{respond(res,503,{error:'neopass_auth_unavailable'});return true}
    if(member?.role!=='executive-admin'||member?.neopassStatus!=='active'){
      respond(res,403,{error:'operator_role_required'});return true
    }
    const parameters=[...url.searchParams.entries()]
    if(parameters.length!==2||
      new Set(parameters.map(([key])=>key)).size!==2||
      parameters.some(([key])=>key!=='scope'&&key!=='project')){
      respond(res,400,{error:'invalid_project_request'});return true
    }
    const scope=url.searchParams.get('scope')
    const id=url.searchParams.get('project')
    if(!['apps','systems','workstreams'].includes(scope)||
       typeof id!=='string'||!/^[A-Za-z0-9-]{1,64}$/.test(id)){
      respond(res,400,{error:'invalid_project_request'});return true
    }
    const grant=resolveNeoBitcoinCapability({scope,id,capability:'counterparty.observe'})
    if(!grant.allowed||!allowed.has(id)){
      audit({event:'counterparty_mainnet_observation',scope,projectId:id,allowed:false,time:now()})
      respond(res,403,{error:'counterparty_observation_not_allowed'});return true
    }
    try{
      const observed=await observeCounterpartyMainnet({fetchImpl})
      audit({event:'counterparty_mainnet_observation',scope,projectId:id,allowed:true,outcome:'ready',time:now()})
      respond(res,200,{service:'neo-core-counterparty-observer',scope,projectId:id,...observed,observedAt:now()})
    }catch{
      audit({event:'counterparty_mainnet_observation',scope,projectId:id,allowed:true,outcome:'unavailable',time:now()})
      respond(res,503,{error:'counterparty_mainnet_not_ready'})
    }
    return true
  }
}
