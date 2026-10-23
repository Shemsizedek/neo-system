const unavailable=(status)=>({
  mode:'PUBLIC_READ_ONLY',available:false,status,
  totalHashrateTh:null,reserveHashrateTh:null,allocatableHashrateTh:null,
  contractActivationEnabled:false
})

export function capacityBridgeConfig(env={}){
  const url=String(env.NEO_GENERATOR_CAPACITY_URL||'').trim()
  const token=String(env.NEO_GENERATOR_CAPACITY_TOKEN||'').trim()
  if(!url&&!token)return null
  if(!url||!/^[a-f0-9]{64}$/i.test(token))throw new Error('GENERATOR_CAPACITY_AUTH_CONFIGURATION_INVALID')
  let parsed
  try{parsed=new URL(url)}catch{throw new Error('GENERATOR_CAPACITY_URL_INVALID')}
  if(parsed.protocol!=='https:'||parsed.pathname!=='/capacity'||parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error('GENERATOR_CAPACITY_URL_MUST_BE_HTTPS_EXACT_CAPACITY')
  const configuredReserve=env.NEO_GENERATOR_RESERVE_PCT
  const reservePct=configuredReserve===undefined?7:Number(configuredReserve)
  if(!Number.isFinite(reservePct)||reservePct<0||reservePct>100)throw new Error('GENERATOR_RESERVE_PCT_INVALID')
  return {url:parsed.toString(),token,reservePct}
}

export function verifyCapacityFeed(data,{nowMs=Date.now(),maxAgeMs=60_000}={}){
  if(!data||data.source!=='SIGNED_AGENT_FLEET'||
     !['VERIFIED','BLOCKED'].includes(data.status)||
     !Number.isSafeInteger(data.eligibleMiners)||data.eligibleMiners<0||
     typeof data.eligibleHashrateTh!=='number'||!Number.isFinite(data.eligibleHashrateTh)||data.eligibleHashrateTh<0||
     typeof data.generatedAt!=='string')return {ok:false,status:'INVALID_VERIFIED_TELEMETRY'}
  const generated=Date.parse(data.generatedAt)
  if(!Number.isFinite(generated)||generated<nowMs-maxAgeMs||generated>nowMs+5_000)return {ok:false,status:'STALE_OR_FUTURE_TELEMETRY'}
  if(data.status==='BLOCKED'){
    if(data.eligibleMiners!==0||data.eligibleHashrateTh!==0)return {ok:false,status:'INVALID_VERIFIED_TELEMETRY'}
    return {ok:false,status:'NO_VERIFIED_HARDWARE_CAPACITY'}
  }
  if(data.eligibleMiners<1||data.eligibleHashrateTh<=0)return {ok:false,status:'INVALID_VERIFIED_TELEMETRY'}
  return {ok:true,status:'VERIFIED_CAPACITY',totalHashrateTh:data.eligibleHashrateTh,verifiedMiners:data.eligibleMiners,observedAt:data.generatedAt}
}

/**
 * This bridge uses read-only transport credentials. It never accepts device
 * telemetry directly or confers authorization to sell hashpower.
 */
export async function readGeneratorCapacity({env=process.env,fetchImpl=fetch,nowMs=Date.now()}={}){
  let config
  try{config=capacityBridgeConfig(env)}catch{return unavailable('CAPACITY_BRIDGE_CONFIGURATION_INVALID')}
  if(!config)return unavailable('LIVE_MINER_TELEMETRY_NOT_CONNECTED')
  try{
    const res=await fetchImpl(config.url,{
      method:'GET',
      headers:{accept:'application/json',authorization:`Bearer ${config.token}`},
      redirect:'error',signal:AbortSignal.timeout(5000)
    })
    if(!res.ok)return unavailable('MINER_CAPACITY_SOURCE_UNAVAILABLE')
    const check=verifyCapacityFeed(await res.json(),{nowMs})
    if(!check.ok)return unavailable(check.status)
    const total=check.totalHashrateTh
    const reserve=total*config.reservePct/100
    return {
      mode:'PUBLIC_READ_ONLY',available:true,status:'VERIFIED_CAPACITY_READ_ONLY',
      source:'SIGNED_AGENT_FLEET',verifiedMiners:check.verifiedMiners,
      generatedAt:check.observedAt,totalHashrateTh:total,
      reserveHashrateTh:reserve,allocatableHashrateTh:Math.max(0,total-reserve),
      reservePct:config.reservePct,contractActivationEnabled:false,
      note:'Verified operational capacity is informational. Contracts, payments and allocation commands remain disabled until separate production gates pass.'
    }
  }catch{return unavailable('MINER_CAPACITY_SOURCE_UNREACHABLE')}
}
