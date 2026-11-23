import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import {once} from 'node:events'

const port=10081
const root='http://127.0.0.1:'+port
const start=()=>spawn(process.execPath,['deploy/neo-bitcoin-gateway-staging/server.mjs'],{
  cwd:process.cwd(),
  env:{...process.env,HOST:'127.0.0.1',PORT:String(port),NODE_ENV:'staging'},
  stdio:['ignore','pipe','pipe']
})
async function probe(){
  const health=await fetch(root+'/healthz',{signal:AbortSignal.timeout(1500)})
  assert.equal(health.status,200)
  const data=await health.json()
  assert.equal(data.service,'neo-bitcoin-gateway-staging')
  assert.equal(data.bitcoinRpc,'not_configured')
  assert.equal(data.bitcoinAccess,'disabled')
  assert.equal(data.liveMainnet,false)
  assert.equal(health.headers.get('access-control-allow-origin'),null)
  const blocked=await fetch(root+'/api/v1/bitcoin/chain?scope=apps&project=neo-counter',{
    headers:{authorization:'Bearer fake-staging-token'},
    signal:AbortSignal.timeout(1500)
  })
  assert.equal(blocked.status,404)
  assert.deepEqual(await blocked.json(),{error:'not_found'})
  const missing=await fetch(root+'/rpc',{signal:AbortSignal.timeout(1500)})
  assert.equal(missing.status,404)
}
async function cycle(label){
  const child=start()
  let output=''
  child.stderr.on('data',data=>output+=String(data))
  try{
    let ready=false
    for(let i=0;i<40;i++){
      if(child.exitCode!==null)throw new Error('SERVICE_EXITED '+output.slice(0,500))
      try{await probe();ready=true;break}catch(error){
        if(i===39)throw error
        await sleep(150)
      }
    }
    assert.ok(ready)
    process.stdout.write(label+' passed: loopback health, disabled RPC, no public Bitcoin access\n')
  }finally{
    child.kill('SIGTERM')
    await Promise.race([once(child,'exit'),sleep(3000)])
    if(child.exitCode===null)child.kill('SIGKILL')
  }
  for(let i=0;i<15;i++){
    try{await fetch(root+'/healthz',{signal:AbortSignal.timeout(150)});await sleep(100)}
    catch{return}
  }
  throw new Error('SERVICE_STILL_LISTENING_AFTER_STOP')
}
await cycle('first start')
await cycle('restart')
process.stdout.write('NEO Bitcoin staging runner deployment and restart/rollback check passed\n')
