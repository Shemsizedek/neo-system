export function createTokenworksCrownAuthorizer({
  agents={
    'neo-tokenworks':{url:process.env.NEO_TOKENWORKS_CROWN_AGENT_URL,operatorToken:process.env.NEO_TOKENWORKS_CROWN_OPERATOR_TOKEN},
    tokenpass:{url:process.env.TOKENPASS_CROWN_AGENT_URL,operatorToken:process.env.TOKENPASS_CROWN_OPERATOR_TOKEN}
  },
  fetchImpl=fetch
}={}){
  return async function authorize(service,scope){
    const cfg=agents[service]||{}
    const base=String(cfg.url||'').replace(/\/$/,'')
    const token=String(cfg.operatorToken||'').trim()
    if(!base||!token)return{verified:false,error:'crown_service_authorizer_unconfigured'}
    try{
      const response=await fetchImpl(`${base}/crown/prove`,{
        method:'POST',
        headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
        body:JSON.stringify({scopes:[scope]})
      })
      const result=await response.json().catch(()=>({}))
      if(!response.ok||result.verified!==true||!Array.isArray(result.scopes)||!result.scopes.includes(scope)){
        return{verified:false,error:'crown_capability_denied',status:response.status}
      }
      return{verified:true,service,scope,expires_in:result.expires_in}
    }catch{
      return{verified:false,error:'crown_service_authorizer_unavailable'}
    }
  }
}
