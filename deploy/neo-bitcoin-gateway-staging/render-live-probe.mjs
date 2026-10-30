import assert from 'node:assert/strict'

// External, uncredentialed verification of the actual NEO SYSTEM Render service.
// No real Bitcoin Core endpoint, key, token, wallet, or transaction is used.
const origin='https://neo-bvm-144-staging.onrender.com'
const timeoutMs=12000
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function request(path,opts={}){
  return fetch(origin+path,{
    method:'GET',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(timeoutMs),...opts
  })
}
let response,health,lastError
for(let attempt=0;attempt<20;attempt++){
  try{
    response=await request('/healthz')
    if(response.status===200){
      health=await response.json()
      break
    }
    lastError=new Error('HEALTH_HTTP_'+response.status)
  }catch(error){lastError=error}
  if(attempt<19)await sleep(3000)
}
if(!health)throw new Error('RENDER_HEALTH_UNVERIFIED:'+String(lastError?.message||lastError))
assert.equal(health.service,'neo-bitcoin-gateway-staging')
assert.equal(health.status,'running')
assert.equal(health.bitcoinRpc,'not_configured')
assert.equal(health.bitcoinAccess,'disabled')
assert.equal(health.liveMainnet,false)
assert.equal(response.headers.get('cache-control'),'no-store')
assert.equal(response.headers.get('access-control-allow-origin'),null)

for(const path of [
  '/api/v1/bitcoin/chain?scope=apps&project=neo-counter',
  '/api/v1/bitcoin/counterparty/mainnet?scope=apps&project=neo-counter',
  '/rpc',
  '/wallet'
]){
  const r=await request(path,{
    headers:{authorization:'Bearer fake-not-a-credential',
      'x-neopass-subject':'fake-admin'}
  })
  assert.equal(r.status,404,path+' must not expose Bitcoin gateway')
  assert.equal(r.headers.get('access-control-allow-origin'),null)
  assert.deepEqual(await r.json(),{error:'not_found'})
}
const post=await request('/api/v1/bitcoin/chain?scope=apps&project=neo-counter',{
  method:'POST',headers:{'content-type':'application/json'},body:'{}'
})
assert.equal(post.status,404)
process.stdout.write(JSON.stringify({
  service:health.service,renderWorkspace:'NEO SYSTEM',
  endpoint:origin,healthStatus:response.status,bitcoinAccess:'disabled',
  protectedEndpointStatuses:[404,404,404,404],postStatus:404,
  mainnetExecutionEnabled:false,pass:true
})+'\n')
