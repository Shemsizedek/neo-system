const boundedInteger=(env,key,fallback,{min=1,max=Number.MAX_SAFE_INTEGER}={})=>{
  const raw=env[key]
  const value=raw===undefined||raw===null||String(raw).trim()===''?fallback:Number(raw)
  if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(`${key}_INVALID`)
  return value
}

export function loadWorldMintConfig(env=process.env){
  const required=['BITCOIN_RPC_URL','BITCOIN_RPC_AUTH','WORLD_MINT_PAYOUT_SCRIPT_HEX']
  const missing=required.filter(key=>!String(env[key]||'').trim())
  if(missing.length)throw new Error(`WORLD_MINT_CONFIG_MISSING:${missing.join(',')}`)
  const rpcUrl=String(env.BITCOIN_RPC_URL)
  let parsed
  try{parsed=new URL(rpcUrl)}catch{throw new Error('BITCOIN_RPC_URL_INVALID')}
  if(!['http:','https:'].includes(parsed.protocol))throw new Error('BITCOIN_RPC_URL_INVALID')
  if(!['127.0.0.1','localhost','::1'].includes(parsed.hostname)&&String(env.ALLOW_REMOTE_BITCOIN_RPC||'').toLowerCase()!=='true')throw new Error('REMOTE_BITCOIN_RPC_BLOCKED')
  const payoutScriptHex=String(env.WORLD_MINT_PAYOUT_SCRIPT_HEX).trim()
  if(!/^[0-9a-f]+$/i.test(payoutScriptHex)||payoutScriptHex.length%2)throw new Error('WORLD_MINT_PAYOUT_SCRIPT_INVALID')
  return Object.freeze({
    poolId:String(env.NIBIRU_POOL_ID||'world-mint-genesis'),
    rpcUrl,
    rpcAuth:String(env.BITCOIN_RPC_AUTH),
    payoutScriptHex,
    dbPath:String(env.NEO_MINER_DB_PATH||'./data/neo-miner.sqlite'),
    stratumHost:String(env.NIBIRU_STRATUM_HOST||'127.0.0.1'),
    stratumPort:boundedInteger(env,'NIBIRU_STRATUM_PORT',3333,{max:65535}),
    stratumMaxConnections:boundedInteger(env,'NIBIRU_STRATUM_MAX_CONNECTIONS',128,{max:100000}),
    stratumMaxLineBytes:boundedInteger(env,'NIBIRU_STRATUM_MAX_LINE_BYTES',16384,{min:512,max:1048576}),
    stratumIdleTimeoutMs:boundedInteger(env,'NIBIRU_STRATUM_IDLE_TIMEOUT_MS',120000,{min:1000,max:86400000}),
    stratumSubmitWindowMs:boundedInteger(env,'NIBIRU_STRATUM_SUBMIT_WINDOW_MS',1000,{min:100,max:60000}),
    stratumMaxSubmissionsPerWindow:boundedInteger(env,'NIBIRU_STRATUM_MAX_SUBMISSIONS_PER_WINDOW',64,{max:100000}),
    stratumShutdownGraceMs:boundedInteger(env,'NIBIRU_STRATUM_SHUTDOWN_GRACE_MS',3000,{min:100,max:60000}),
    healthHost:String(env.NIBIRU_HEALTH_HOST||'127.0.0.1'),
    healthPort:boundedInteger(env,'NIBIRU_HEALTH_PORT',3334,{max:65535}),
    templateRefreshMs:boundedInteger(env,'NIBIRU_TEMPLATE_REFRESH_MS',15000,{min:1000,max:3600000}),
    confirmationCheckMs:boundedInteger(env,'NIBIRU_CONFIRMATION_CHECK_MS',30000,{min:1000,max:3600000})
  })
}

export function redactedConfig(config){
  return Object.freeze({...config,rpcAuth:'[REDACTED]',payoutScriptHex:config.payoutScriptHex?`${config.payoutScriptHex.slice(0,12)}…`:'[UNSET]'})
}
