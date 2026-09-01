import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'

process.env.NEO_MINER_OPERATOR_TOKEN='test-token'
const {createServer}=await import('./server.mjs')

async function withServer(run){
  const server=createServer()
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const {port}=server.address()
  try{await run(`http://127.0.0.1:${port}`,port)}
  finally{await new Promise(resolve=>server.close(resolve))}
}

test('health is public and identifies read-only bootstrap mode',()=>withServer(async base=>{
  const response=await fetch(`${base}/health`)
  assert.equal(response.status,200)
  const body=await response.json()
  assert.equal(body.mode,'READ_ONLY_BOOTSTRAP')
}))

test('snapshot rejects missing credentials',()=>withServer(async base=>{
  const response=await fetch(`${base}/discord/snapshot`)
  assert.equal(response.status,401)
}))

test('snapshot clearly reports bootstrap as not live',()=>withServer(async base=>{
  const response=await fetch(`${base}/discord/snapshot`,{headers:{authorization:'Bearer test-token'}})
  assert.equal(response.status,200)
  const body=await response.json()
  assert.equal(body.status,'BOOTSTRAP_NOT_LIVE')
  assert.equal(body.mutates,false)
  assert.equal(body.liveMining,false)
  assert.equal(body.mode,'READ_ONLY_BOOTSTRAP')
}))

test('malformed request target returns 400 without terminating the server',()=>withServer(async (base,port)=>{
  const response=await new Promise((resolve,reject)=>{
    const socket=net.createConnection({host:'127.0.0.1',port},()=>socket.write('GET http://[ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'))
    let raw=''
    socket.on('data',chunk=>{raw+=chunk})
    socket.on('end',()=>resolve(raw))
    socket.on('error',reject)
  })
  assert.match(response,/^HTTP\/1\.1 400 /)
  const health=await fetch(`${base}/health`)
  assert.equal(health.status,200)
}))
