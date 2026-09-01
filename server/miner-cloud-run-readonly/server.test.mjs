import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NEO_MINER_OPERATOR_TOKEN='test-token'
const {createServer}=await import('./server.mjs')

async function withServer(run){
  const server=createServer()
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const {port}=server.address()
  try{await run(`http://127.0.0.1:${port}`)}
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

test('snapshot returns operational scalars only for valid bearer token',()=>withServer(async base=>{
  const response=await fetch(`${base}/discord/snapshot`,{headers:{authorization:'Bearer test-token'}})
  assert.equal(response.status,200)
  const body=await response.json()
  assert.equal(body.mutates,false)
  assert.equal(body.liveMining,false)
  assert.equal(body.mode,'READ_ONLY_BOOTSTRAP')
}))
