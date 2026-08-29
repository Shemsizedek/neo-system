import {createRemoteJWKSet,jwtVerify} from 'jose'

function csv(value){
  if(Array.isArray(value)) return value.map(String)
  if(typeof value!=='string') return []
  return value.split(',').map(v=>v.trim()).filter(Boolean)
}

export function actorFromClaims(claims){
  const actor={
    id:String(claims.sub||''),
    type:String(claims.actor_type||'user'),
    roles:csv(claims.roles),
    tenantIds:csv(claims.tenant_ids),
    surface:claims.surface?String(claims.surface):undefined,
    fingerprint:claims.fingerprint?String(claims.fingerprint):undefined
  }
  if(!actor.id) throw new Error('subject claim is required')
  if(actor.tenantIds.length===0) throw new Error('tenant_ids claim is required')
  return actor
}

export async function verifyBearer(request,env=process.env){
  const header=request.headers?.authorization||request.headers?.get?.('authorization')||''
  const token=String(header).replace(/^Bearer\s+/i,'').trim()
  if(!token) throw new Error('bearer token required')

  const issuer=env.RELATIONS_JWT_ISSUER
  const audience=env.RELATIONS_JWT_AUDIENCE||'neo-relations'
  if(!issuer) throw new Error('RELATIONS_JWT_ISSUER is required')

  let key
  if(env.RELATIONS_JWKS_URL){
    key=createRemoteJWKSet(new URL(env.RELATIONS_JWKS_URL))
  }else if(env.RELATIONS_JWT_SECRET){
    key=new TextEncoder().encode(env.RELATIONS_JWT_SECRET)
  }else{
    throw new Error('RELATIONS_JWKS_URL or RELATIONS_JWT_SECRET is required')
  }

  const {payload}=await jwtVerify(token,key,{issuer,audience})
  return actorFromClaims(payload)
}
