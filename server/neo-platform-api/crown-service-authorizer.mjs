export function createCrownServiceAuthorizer({agents={},fetchImpl=fetch}={}) {
  return async function authorize(service,scope) {
    const config=agents[service]||{}
    const url=String(config.url||'').replace(/\/$/,'')
    const token=String(config.operatorToken||'').trim()
    if(!url||!token)return{verified:false,error:'crown_service_authorizer_unconfigured',service,scope}
    try{
      const response=await fetchImpl(`${url}/crown/prove`,{
        method:'POST',
        headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
        body:JSON.stringify({scopes:[scope]})
      })
      const result=await response.json().catch(()=>({}))
      if(!response.ok||result.verified!==true||!Array.isArray(result.scopes)||!result.scopes.includes(scope)){
        return{verified:false,error:'crown_capability_denied',service,scope,status:response.status}
      }
      return{verified:true,service,scope,expires_in:result.expires_in,key_id:result.key_id||null}
    }catch{
      return{verified:false,error:'crown_service_authorizer_unavailable',service,scope}
    }
  }
}
