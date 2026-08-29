function parseHttpsOrigin(value,label){
  let url
  try{url=new URL(String(value||''))}catch{throw new Error(`${label}_INVALID`)}
  if(url.protocol!=='https:')throw new Error(`${label}_HTTPS_REQUIRED`)
  if(url.username||url.password||url.search||url.hash)throw new Error(`${label}_INVALID`)
  if(url.pathname!=='/'&&url.pathname!=='')throw new Error(`${label}_ORIGIN_ONLY`)
  return url
}
const normalizeSuffix=v=>{const s=String(v||'').trim().toLowerCase().replace(/^\.+/,'');if(!s||!s.includes('.'))throw new Error('OPERATOR_SITE_SUFFIX_REQUIRED');return s}
const hostWithin=(host,suffix)=>host===suffix||host.endsWith(`.${suffix}`)

export function validateOperatorDeploymentPolicy({
  consoleOrigin=process.env.NEO_OPERATOR_ORIGIN,
  operatorPublicUrl=process.env.NEO_OPERATOR_PUBLIC_URL,
  siteSuffix=process.env.NEO_OPERATOR_SITE_SUFFIX,
  sameSite=process.env.NEO_OPERATOR_COOKIE_SAMESITE||'Lax',
  secure=process.env.NEO_OPERATOR_COOKIE_SECURE!=='false',
  requireSameSite=process.env.NEO_OPERATOR_REQUIRE_SAME_SITE!=='false'
}={}){
  const consoleUrl=parseHttpsOrigin(consoleOrigin,'OPERATOR_CONSOLE_ORIGIN')
  const apiUrl=parseHttpsOrigin(operatorPublicUrl,'OPERATOR_PUBLIC_URL')
  if(!secure)throw new Error('OPERATOR_SECURE_COOKIE_REQUIRED')
  const normalizedSameSite=String(sameSite).trim()
  if(!['Strict','Lax','None'].includes(normalizedSameSite))throw new Error('OPERATOR_SAMESITE_INVALID')
  let suffix=null,sameSiteDomain=false
  if(requireSameSite){
    suffix=normalizeSuffix(siteSuffix)
    sameSiteDomain=hostWithin(consoleUrl.hostname.toLowerCase(),suffix)&&hostWithin(apiUrl.hostname.toLowerCase(),suffix)
    if(!sameSiteDomain)throw new Error('OPERATOR_SAME_SITE_DOMAIN_REQUIRED')
    if(normalizedSameSite==='None')throw new Error('OPERATOR_SAMESITE_NONE_NOT_ALLOWED_IN_SAME_SITE_MODE')
  }
  if(consoleUrl.origin===apiUrl.origin)throw new Error('OPERATOR_API_MUST_BE_SEPARATE_ORIGIN')
  return {ok:true,consoleOrigin:consoleUrl.origin,operatorOrigin:apiUrl.origin,siteSuffix:suffix,sameSite:normalizedSameSite,secure:true,sameSiteDomain,requireSameSite:Boolean(requireSameSite)}
}
