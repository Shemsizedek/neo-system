function assert(condition,code){if(!condition)throw new Error(code)}

export async function runMinerReadLiveSmoke(env=process.env,{fetchImpl=fetch}={}){
  const url=String(env.NEO_MINER_OPERATOR_URL||'').trim()
  const token=String(env.NEO_MINER_OPERATOR_TOKEN||'').trim()
  assert(url&&token,'MINER_LIVE_SMOKE_CONFIGURATION_REQUIRED')

  const response=await fetchImpl(url,{
    method:'GET',
    headers:{accept:'application/json',authorization:`Bearer ${token}`},
    redirect:'follow',
    signal:AbortSignal.timeout(15000)
  })
  const text=await response.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{}
  assert(response.ok,`MINER_MACHINE_READ_HTTP_${response.status||'ERROR'}`)
  assert(data&&typeof data==='object'&&!Array.isArray(data),'MINER_MACHINE_READ_JSON_REQUIRED')
  assert(data.mode==='READ_ONLY_BOOTSTRAP','MINER_READ_ONLY_BOOTSTRAP_MODE_REQUIRED')
  assert(data.status==='BOOTSTRAP_NOT_LIVE','MINER_BOOTSTRAP_NOT_LIVE_STATUS_REQUIRED')
  assert(data.mutates===false,'MINER_MUTATION_FALSE_REQUIRED')
  assert(data.liveMining===false,'MINER_LIVE_MINING_FALSE_REQUIRED')

  return {ok:true,status:response.status,mode:data.mode,minerStatus:data.status,mutates:false,liveMining:false}
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{console.log(JSON.stringify(await runMinerReadLiveSmoke(process.env)))}
  catch(error){console.error(String(error?.message||error));process.exit(1)}
}
