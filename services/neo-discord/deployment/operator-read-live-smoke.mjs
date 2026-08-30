function assert(condition,code){if(!condition)throw new Error(code)}
async function readJson(url,token,fetchImpl=fetch){
  const r=await fetchImpl(url,{method:'GET',headers:{accept:'application/json',authorization:`Bearer ${token}`},redirect:'follow',signal:AbortSignal.timeout(15000)})
  const text=await r.text()
  let data=null
  try{data=text?JSON.parse(text):null}catch{}
  return {ok:r.ok,status:r.status,data}
}

export async function runOperatorReadLiveSmoke(env=process.env,{fetchImpl=fetch}={}){
  const minerUrl=String(env.NEO_MINER_OPERATOR_URL||'').trim()
  const minerToken=String(env.NEO_MINER_OPERATOR_TOKEN||'').trim()
  const relationsUrl=String(env.NEO_RELATIONS_OPERATOR_URL||'').trim()
  const relationsToken=String(env.NEO_RELATIONS_OPERATOR_TOKEN||'').trim()
  assert(minerUrl&&minerToken&&relationsUrl&&relationsToken,'LIVE_SMOKE_CONFIGURATION_REQUIRED')

  const miner=await readJson(minerUrl,minerToken,fetchImpl)
  assert(miner.ok,`MINER_MACHINE_READ_HTTP_${miner.status||'ERROR'}`)
  assert(miner.data&&typeof miner.data==='object'&&!Array.isArray(miner.data),'MINER_MACHINE_READ_JSON_REQUIRED')

  const relations=await readJson(relationsUrl,relationsToken,fetchImpl)
  assert(relations.ok,`RELATIONS_MACHINE_READ_HTTP_${relations.status||'ERROR'}`)
  assert(relations.data&&typeof relations.data==='object'&&!Array.isArray(relations.data),'RELATIONS_MACHINE_READ_JSON_REQUIRED')
  assert(Number.isFinite(Number(relations.data.pendingApprovals)),'RELATIONS_PENDING_APPROVAL_COUNT_REQUIRED')
  assert(relations.data.readOnly===true,'RELATIONS_READ_ONLY_MARKER_REQUIRED')
  assert(relations.data.recordsIncluded===false,'RELATIONS_RECORDS_MUST_NOT_BE_INCLUDED')
  for(const forbidden of ['items','records','contacts','relationships','payload'])assert(!(forbidden in relations.data),`RELATIONS_FORBIDDEN_FIELD_${forbidden.toUpperCase()}`)

  return {
    ok:true,
    miner:{status:miner.status,object:true},
    relations:{status:relations.status,pendingApprovals:Number(relations.data.pendingApprovals),readOnly:true,recordsIncluded:false}
  }
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const out=await runOperatorReadLiveSmoke(process.env)
    console.log(JSON.stringify(out))
  }catch(error){
    console.error(String(error?.message||error))
    process.exit(1)
  }
}
