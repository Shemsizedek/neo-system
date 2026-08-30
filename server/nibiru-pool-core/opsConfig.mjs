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
    stratumHost:String(env.NIBIRU_STRATUM_HOST||'0.0.0.0'),
    stratumPort:Number(env.NIBIRU_STRATUM_PORT||3333),
    healthHost:String(env.NIBIRU_HEALTH_HOST||'127.0.0.1'),
    healthPort:Number(env.NIBIRU_HEALTH_PORT||3334),
    templateRefreshMs:Number(env.NIBIRU_TEMPLATE_REFRESH_MS||15000),
    confirmationCheckMs:Number(env.NIBIRU_CONFIRMATION_CHECK_MS||30000)
  })
}

export function redactedConfig(config){
  return Object.freeze({...config,rpcAuth:'[REDACTED]',payoutScriptHex:config.payoutScriptHex?`${config.payoutScriptHex.slice(0,12)}…`:'[UNSET]'})
}
