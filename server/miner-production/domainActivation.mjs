import dns from 'node:dns/promises'

const normalizeHost=value=>new URL(value).hostname.toLowerCase()

export function validateActivationConfig({consoleOrigin,operatorApi,siteSuffix}){
  const consoleUrl=new URL(consoleOrigin)
  const operatorUrl=new URL(operatorApi)
  const suffix=String(siteSuffix||'').toLowerCase().replace(/^\./,'')
  if(consoleUrl.protocol!=='https:'||operatorUrl.protocol!=='https:') throw new Error('ACTIVATION_HTTPS_REQUIRED')
  if(!suffix) throw new Error('ACTIVATION_SITE_SUFFIX_REQUIRED')
  const inSite=host=>host===suffix||host.endsWith(`.${suffix}`)
  if(!inSite(consoleUrl.hostname.toLowerCase())||!inSite(operatorUrl.hostname.toLowerCase())) throw new Error('ACTIVATION_ORIGIN_OUTSIDE_SITE_SUFFIX')
  if(consoleUrl.origin===operatorUrl.origin) throw new Error('ACTIVATION_SEPARATE_ORIGINS_REQUIRED')
  return {consoleOrigin:consoleUrl.origin,operatorApi:operatorUrl.origin,siteSuffix:suffix,operatorHost:operatorUrl.hostname.toLowerCase()}
}

export async function resolveOperatorDns(operatorApi){
  const host=normalizeHost(operatorApi)
  const result={host,cname:[],addresses:[]}
  try{result.cname=await dns.resolveCname(host)}catch{}
  try{result.addresses=await dns.resolve4(host)}catch{}
  if(!result.cname.length&&!result.addresses.length) throw new Error('ACTIVATION_DNS_UNRESOLVED')
  return result
}

const jsonBody=async response=>{try{return await response.json()}catch{return null}}

export async function probeOperatorEdge({operatorApi,consoleOrigin,fetchImpl=fetch}){
  const base=String(operatorApi).replace(/\/$/,'')
  const health=await fetchImpl(`${base}/health`,{headers:{origin:consoleOrigin},redirect:'manual'})
  if(!health.ok) throw new Error(`ACTIVATION_HEALTH_FAILED_${health.status}`)
  if(health.headers.get('access-control-allow-origin')!==consoleOrigin) throw new Error('ACTIVATION_CORS_ORIGIN_MISMATCH')
  if(health.headers.get('access-control-allow-credentials')!=='true') throw new Error('ACTIVATION_CORS_CREDENTIALS_REQUIRED')
  const healthBody=await jsonBody(health)
  if(healthBody?.status!=='UP') throw new Error('ACTIVATION_OPERATOR_NOT_UP')

  const ready=await fetchImpl(`${base}/ready`,{headers:{origin:consoleOrigin},redirect:'manual'})
  if(!ready.ok) throw new Error(`ACTIVATION_READY_FAILED_${ready.status}`)
  const readyBody=await jsonBody(ready)
  if(readyBody?.status!=='READY') throw new Error('ACTIVATION_PRIVATE_BACKEND_NOT_READY')

  const anonymous=await fetchImpl(`${base}/session`,{headers:{origin:consoleOrigin},redirect:'manual'})
  if(anonymous.status!==401) throw new Error('ACTIVATION_ANONYMOUS_SESSION_NOT_BLOCKED')

  return {
    health:healthBody,
    ready:readyBody,
    cloudflareEdge:Boolean(health.headers.get('cf-ray')),
    server:health.headers.get('server')||null
  }
}

export async function runDomainActivationGate(config,{fetchImpl=fetch}={}){
  const validated=validateActivationConfig(config)
  const dnsResult=await resolveOperatorDns(validated.operatorApi)
  const edge=await probeOperatorEdge({...validated,fetchImpl})
  return {ok:true,validated,dns:dnsResult,edge,checkedAt:new Date().toISOString()}
}

if(import.meta.url===`file://${process.argv[1]}`){
  const config={
    consoleOrigin:process.env.NEO_OPERATOR_ORIGIN,
    operatorApi:process.env.NEO_MINER_OPERATOR_API,
    siteSuffix:process.env.NEO_OPERATOR_SITE_SUFFIX
  }
  runDomainActivationGate(config).then(result=>{
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`)
    if(!result.edge.cloudflareEdge) process.stderr.write('Warning: no cf-ray header observed; endpoint may not be traversing Cloudflare.\n')
  }).catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1})
}
