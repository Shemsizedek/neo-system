import {resolveNeoBitcoinCapability} from '../neo-vm/project-policy.mjs'
import {restrictedBvmBitcoinRpc} from '../neo-vm/shared-bitcoin-core.mjs'

function reply(res,status,value){
  const body=JSON.stringify(value)
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'content-length':Buffer.byteLength(body),
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer',
    'vary':'Authorization, Cookie'
  })
  res.end(body)
}

function operatorOnly(member){
  return member?.role==='executive-admin' && member?.neopassStatus==='active'
}

export function createBitcoinGatewayHandler({
  enabled=false,
  rpc=null,
  subjectResolver,
  authService=null,
  allowedProjects=[],
  expectedChain='main',
  audit=()=>{},
  now=()=>new Date().toISOString()
}={}){
  // Gateway does not expose BVM validation or Counterparty transaction composition.
  // Authorization is independent of the project capability profile.
  const allowed=new Set(
    (typeof allowedProjects==='string'?allowedProjects.split(','):allowedProjects)
      .filter(v=>typeof v==='string' && /^[a-z0-9-]{1,64}$/.test(v))
  )
  const readRpc=typeof rpc==='function'?restrictedBvmBitcoinRpc(rpc):null

  return async function handleBitcoinGateway(req,res,url){
    if(url.pathname!=='/api/v1/bitcoin/chain')return false
    if(!enabled){reply(res,404,{error:'not_found'});return true}
    if(req.method!=='GET'){reply(res,405,{error:'method_not_allowed'});return true}
    if(req.headers['sec-fetch-site']==='cross-site'){
      reply(res,403,{error:'cross_site_request_blocked'});return true
    }
    if(typeof subjectResolver!=='function'||typeof authService?.session!=='function'){
      reply(res,503,{error:'neopass_auth_unavailable'});return true
    }
    const subject=subjectResolver(req)
    if(typeof subject!=='string'||!subject){
      reply(res,401,{error:'neopass_identity_required'});return true
    }
    let member
    try{member=await authService.session(subject,req.neopassClaims||{})}
    catch{reply(res,503,{error:'neopass_auth_unavailable'});return true}
    if(!operatorOnly(member)){reply(res,403,{error:'operator_role_required'});return true}

    const scope=url.searchParams.get('scope')
    const projectId=url.searchParams.get('project')
    if(!['apps','systems','workstreams'].includes(scope)||
       !projectId||projectId.length>64||
       !/^[A-Za-z0-9-]+$/.test(projectId)||
       [...url.searchParams.keys()].some(key=>!['scope','project'].includes(key)) ||
       [...url.searchParams.keys()].length!==2){
      reply(res,400,{error:'invalid_project_request'});return true
    }
    const grant=resolveNeoBitcoinCapability({scope,id:projectId,capability:'bitcoin.observe'})
    if(!grant.allowed || !allowed.has(projectId)){
      audit({event:'neo_bitcoin_gateway',subject,scope,projectId,allowed:false,time:now()})
      reply(res,403,{error:'bitcoin_observation_not_allowed'});return true
    }
    if(!readRpc){
      reply(res,503,{error:'trusted_bitcoin_rpc_unavailable'});return true
    }
    try{
      const chain=await readRpc('getblockchaininfo',[])
      const network=await readRpc('getnetworkinfo',[])
      const blocks=chain?.blocks,headers=chain?.headers
      if(chain?.chain!==expectedChain||network?.networkactive!==true||
         chain?.initialblockdownload!==false||
         !Number.isSafeInteger(blocks)||blocks<1||
         !Number.isSafeInteger(headers)||headers<blocks||headers-blocks>2){
        audit({event:'neo_bitcoin_gateway',subject,scope,projectId,allowed:true,outcome:'not_ready',time:now()})
        reply(res,503,{error:'bitcoin_node_not_ready'});return true
      }
      audit({event:'neo_bitcoin_gateway',subject,scope,projectId,allowed:true,outcome:'read',time:now()})
      reply(res,200,{
        service:'neo-core-bitcoin-gateway',
        scope,projectId,
        readOnly:true,
        signingEnabled:false,
        broadcastingEnabled:false,
        node:{implementation:'Bitcoin Core',chain:chain.chain,blocks,headers},
        observedAt:now()
      })
    }catch{
      audit({event:'neo_bitcoin_gateway',subject,scope,projectId,allowed:true,outcome:'rpc_error',time:now()})
      reply(res,503,{error:'bitcoin_rpc_unavailable'})
    }
    return true
  }
}
