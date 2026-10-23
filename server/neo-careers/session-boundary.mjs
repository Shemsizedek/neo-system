/** G028 trust boundary. Never pass client-decoded JWT claims here. */
export function authorizeCareersSession({claims, trustedVerification=false, action, resourceOwnerId} = {}) {
  if (trustedVerification !== true) return Object.freeze({allowed:false,reason:'unverified_identity'})
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return Object.freeze({allowed:false,reason:'missing_identity'})
  const {sub,iss,aud,exp,roles,employerId}=claims
  if (typeof sub !== 'string'||!sub||typeof iss !== 'string'||!iss||typeof aud !== 'string'||aud!=='neo-careers') return Object.freeze({allowed:false,reason:'invalid_claims'})
  if (!Number.isSafeInteger(exp)||exp <= Math.floor(Date.now()/1000)) return Object.freeze({allowed:false,reason:'expired_session'})
  if (!Array.isArray(roles)) return Object.freeze({allowed:false,reason:'missing_roles'})
  const allow=role=>roles.includes(role)
  let ok=false
  switch(action){
    case 'view-own-tasks': ok=allow('contributor')&&resourceOwnerId===sub;break
    case 'manage-employer-drafts': ok=allow('employer')&&typeof employerId==='string'&&resourceOwnerId===employerId;break
    case 'review-compensation': ok=allow('payroll-reviewer');break
    default:return Object.freeze({allowed:false,reason:'unsupported_action'})
  }
  return Object.freeze({allowed:ok,reason:ok?'authorized':'insufficient_scope',subject:sub,canSign:false,canBroadcast:false})
}
export function oidcConfigurationChecklist({issuer,audience,jwksUri,httpsOnly=true}={}){
 const issues=[]
 if(typeof issuer!=='string'||!issuer.startsWith('https://'))issues.push('trusted_https_issuer_required')
 if(audience!=='neo-careers')issues.push('audience_mismatch')
 if(typeof jwksUri!=='string'||!jwksUri.startsWith('https://'))issues.push('trusted_https_jwks_required')
 if(httpsOnly!==true)issues.push('https_required')
 return Object.freeze({readyForOperatorConfiguration:issues.length===0,issues,adapterConnected:false})
}
