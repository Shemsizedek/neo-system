import {normalizeMinerOperatorToken} from './miner-read-preflight.mjs'

function assert(condition,code){if(!condition)throw new Error(code)}
const modes=new Set(['READ_ONLY_BOOTSTRAP','READ_ONLY_TELEMETRY'])
const statuses=new Set(['BOOTSTRAP_NOT_LIVE','TELEMETRY_CONNECTED','UPSTREAM_CONFIGURATION_INVALID','UPSTREAM_UNREACHABLE','UPSTREAM_RESPONSE_INVALID'])

export async function runMinerReadLiveSmoke(env=process.env,{fetchImpl=fetch}={}){
  const url=String(env.NEO_MINER_OPERATOR_URL||'').trim()
  const token=normalizeMinerOperatorToken(env.NEO_MINER_OPERATOR_TOKEN)
  assert(url&&token,'MINER_LIVE_SMOKE_CONFIGURATION_REQUIRED')
  const response=await fetchImpl(url,{method:'GET',headers:{accept:'application/json',authorization:`Bearer ${token}`},redirect:'follow',signal:AbortSignal.timeout(15000)})
  const text=await response.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{}
  assert(response.ok,`MINER_MACHINE_READ_HTTP_${response.status||'ERROR'}`)
  assert(data&&typeof data==='object'&&!Array.isArray(data),'MINER_MACHINE_READ_JSON_REQUIRED')
  assert(modes.has(data.mode),'MINER_READ_ONLY_MODE_REQUIRED')
  assert(statuses.has(data.status)||/^UPSTREAM_HTTP_\d{3}$/.test(String(data.status||'')),'MINER_SAFE_STATUS_REQUIRED')
  assert(data.mutates===false,'MINER_MUTATION_FALSE_REQUIRED')
  assert(data.liveMining===false,'MINER_LIVE_MINING_FALSE_REQUIRED')
  return {ok:true,status:response.status,mode:data.mode,minerStatus:data.status,mutates:false,liveMining:false}
}
if(import.meta.url===`file://${process.argv[1]}`){try{console.log(JSON.stringify(await runMinerReadLiveSmoke(process.env)))}catch(error){console.error(String(error?.message||error));process.exit(1)}}
