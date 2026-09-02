import test from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {createServer,validateConfig} from './server.mjs'

const token='a'.repeat(64)
const env={NEO_MINER_TELEMETRY_TOKEN:token,NEO_MINER_API_TOKEN:'internal-only',NEO_MINER_INTERNAL_SNAPSHOT_URL:'http://127.0.0.1:8890/snapshot'}

async function withServer(fetchImpl,run){
  const server=createServer({env,fetchImpl})
  server.listen(0,'127.0.0.1')
  await once(server,'listening')
  try{await run(`http://127.0.0.1:${server.address().port}`)}finally{server.close();await once(server,'close')}
}

test('configuration requires a 64-hex public token and loopback snapshot URL',()=>{
  assert.throws(()=>validateConfig({...env,NEO_MINER_TELEMETRY_TOKEN:'short'}),/64_HEX/)
  assert.throws(()=>validateConfig({...env,NEO_MINER_INTERNAL_SNAPSHOT_URL:'https://public.example/snapshot'}),/LOOPBACK/)
  assert.throws(()=>validateConfig({...env,NEO_MINER_INTERNAL_SNAPSHOT_URL:'http://127.0.0.1:8890/payouts'}),/LOOPBACK/)
})

test('anonymous and mutation requests are denied',async()=>{
  await withServer(async()=>{throw new Error('must not fetch')},async base=>{
    assert.equal((await fetch(`${base}/snapshot`)).status,401)
    assert.equal((await fetch(`${base}/snapshot`,{method:'POST',headers:{authorization:`Bearer ${token}`}})).status,405)
    assert.equal((await fetch(`${base}/payouts`,{headers:{authorization:`Bearer ${token}`}})).status,404)
  })
})

test('snapshot is double-allowlisted and internal credentials never leave',async()=>{
  let request
  await withServer(async(url,options)=>{
    request={url,options}
    return new Response(JSON.stringify({
      status:'BLOCKED',bitcoinConnected:true,bitcoinHeight:900001,poolConnected:true,
      minersOnline:2,verifiedMinerAgents:2,fleetHashrateTh:144,
      incidents:{open:1},wallet:{balance:99},secret:'never-forward'
    }),{status:200,headers:{'content-type':'application/json'}})
  },async base=>{
    const response=await fetch(`${base}/snapshot`,{headers:{authorization:`Bearer ${token}`}})
    assert.equal(response.status,200)
    const body=await response.json()
    assert.equal(body.bitcoin.connected,true)
    assert.equal(body.miners.hashrateTh,144)
    assert.equal('wallet' in body,false)
    assert.equal('secret' in body,false)
    assert.equal(request.url,'http://127.0.0.1:8890/snapshot')
    assert.equal(request.options.headers.authorization,'Bearer internal-only')
  })
})

test('internal failures stay fail-closed',async()=>{
  await withServer(async()=>new Response('no',{status:500}),async base=>{
    const response=await fetch(`${base}/snapshot`,{headers:{authorization:`Bearer ${token}`}})
    assert.equal(response.status,503)
    assert.equal((await response.json()).error,'INTERNAL_SNAPSHOT_UNAVAILABLE')
  })
})
