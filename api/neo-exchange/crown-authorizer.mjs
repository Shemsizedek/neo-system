export function createDexCrownAuthorizer({
  agentUrl=process.env.NEO_DEX_CROWN_AGENT_URL,
  operatorToken=process.env.NEO_DEX_CROWN_OPERATOR_TOKEN,
  fetchImpl=fetch
}={}){
  const base=String(agentUrl||'').replace(/\/$/,'')
  const token=String(operatorToken||'').trim()
  return async function authorize(scope){
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
      return{verified:true,scope,expires_in:result.expires_in}
    }catch{
      return{verified:false,error:'crown_service_authorizer_unavailable'}
    }
  }
}
