import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import {createServer} from './server.mjs'

const baseEnv={NEO_MINER_OPERATOR_TOKEN:'test-token'}
async function withServer(run,{env=baseEnv,fetchImpl=fetch}={}){
  const server=createServer({env,fetchImpl})
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const {port}=server.address()
  try{await run(`http://127.0.0.1:${port}`,port)}
  finally{await new Promise(resolve=>server.close(resolve))}
}
test('health identifies read-only bootstrap mode',()=>withServer(async base=>{
  const body=await (await fetch(`${base}/health`)).json()
  assert.equal(body.mode,'READ_ONLY_BOOTSTRAP')
  assert.equal(body.telemetryConfigured,false)
}))
test('snapshot rejects missing credentials',()=>withServer(async base=>assert.equal((await fetch(`${base}/discord/snapshot`)).status,401)))
test('snapshot clearly reports bootstrap as not live',()=>withServer(async base=>{
  const body=await (await fetch(`${base}/discord/snapshot`,{headers:{authorization:'Bearer test-token'}})).json()
  assert.equal(body.status,'BOOTSTRAP_NOT_LIVE')
  assert.equal(body.mutates,false)
  assert.equal(body.liveMining,false)
}))
test('telemetry bridge performs one authenticated GET and allowlists output',()=>withServer(async base=>{
  const body=await (await fetch(`${base}/discord/snapshot`,{headers:{authorization:'Bearer test-token'}})).json()
  assert.equal(body.status,'TELEMETRY_CONNECTED')
  assert.equal(body.mode,'READ_ONLY_TELEMETRY')
  assert.equal(body.bitcoinConnected,true)
  assert.equal(body.bitcoinHeight,900001)
  assert.equal(body.minersOnline,2)
  assert.equal(body.fleetHashrateTh,144)
  assert.equal(body.incidents.open,1)
  assert.equal(body.mutates,false)
  assert.equal(body.liveMining,false)
  assert.equal('wallet' in body,false)
  assert.equal('secret' in body,false)
}),{
  env:{...baseEnv,NEO_MINER_TELEMETRY_URL:'https://miner.example/snapshot',NEO_MINER_TELEMETRY_TOKEN:'upstream-token'},
  fetchImpl:async(url,init)=>{
    assert.equal(url,'https://miner.example/snapshot')
    assert.equal(init.method,'GET')
    assert.equal(init.headers.authorization,'Bearer upstream-token')
    return new Response(JSON.stringify({status:'OPERATIONAL',bitcoin:{connected:true,height:900001},pool:{connected:true},miners:{online:2,verifiedAgents:2,hashrateTh:144},incidents:{open:1},wallet:{balance:99},secret:'never-forward'}),{status:200})
  }
}))
test('invalid or unreachable upstream fails closed without leaking configuration',()=>withServer(async base=>{
  const body=await (await fetch(`${base}/discord/snapshot`,{headers:{authorization:'Bearer test-token'}})).json()
  assert.equal(body.status,'UPSTREAM_CONFIGURATION_INVALID')
  assert.equal(body.mode,'READ_ONLY_BOOTSTRAP')
  assert.equal(JSON.stringify(body).includes('bad-token'),false)
}),{env:{...baseEnv,NEO_MINER_TELEMETRY_URL:'http://127.0.0.1:8890/snapshot',NEO_MINER_TELEMETRY_TOKEN:'bad-token'}}))
test('malformed request target returns 400 without terminating the server',()=>withServer(async(base,port)=>{
  const response=await new Promise((resolve,reject)=>{const socket=net.createConnection({host:'127.0.0.1',port},()=>socket.write('GET http://[ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'));let raw='';socket.on('data',chunk=>raw+=chunk);socket.on('end',()=>resolve(raw));socket.on('error',reject)})
  assert.match(response,/^HTTP\/1\.1 400 /)
  assert.equal((await fetch(`${base}/health`)).status,200)
}))
