const defaultOrigin=(process.env.CROWN_ORIGIN||'https://crown.holytemples.org').replace(/\/$/,'')

export async function verifyCrownAuthorization({authorization,requiredScope,crownOrigin=defaultOrigin,fetchImpl=fetch}){
  if(!authorization||typeof authorization!=='string')return{ok:false,status:401,error:'CROWN_AUTH_REQUIRED'}
  if(!requiredScope||typeof requiredScope!=='string')throw new Error('requiredScope is required')
  let response
  try{
    response=await fetchImpl(`${crownOrigin}/api/v1/trust/verify`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({authorization,required_scope:requiredScope})
    })
  }catch{
    return{ok:false,status:503,error:'CROWN_UNAVAILABLE'}
  }
  let result={}
  try{result=await response.json()}catch{return{ok:false,status:503,error:'CROWN_INVALID_RESPONSE'}}
  if(!response.ok||result.valid!==true)return{ok:false,status:403,error:'CROWN_CAPABILITY_DENIED'}
  if(!Array.isArray(result.scopes)||!result.scopes.includes(requiredScope))return{ok:false,status:403,error:'CROWN_SCOPE_MISMATCH'}
  return{ok:true,status:200,service_id:result.service_id,scopes:result.scopes,expires_at:result.expires_at,manifest_hash:result.manifest_hash}
}

export function crownCapability(requiredScope,options={}){
  return async function enforce(req,res,next){
    const auth=req.headers?.authorization||''
    const token=auth.startsWith('Bearer ')?auth.slice(7):auth
    const result=await verifyCrownAuthorization({authorization:token,requiredScope,...options})
    if(!result.ok){
      res.statusCode=result.status
      res.setHeader?.('content-type','application/json')
      res.end?.(JSON.stringify({error:result.error,required_scope:requiredScope}))
      return
    }
    req.crown=result
    return next()
  }
}
