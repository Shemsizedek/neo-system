import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import {createWorkerCredential,authenticateWorker} from './workerAuth.mjs'
import {targetFromDifficulty,targetFromBits,hashMeetsTarget} from './shareTarget.mjs'
import {createStratumGateway} from './gatewayCore.mjs'

const connect=server=>new Promise((resolve,reject)=>{
  const address=server.address()
  const socket=net.createConnection({host:'127.0.0.1',port:address.port},()=>resolve(socket))
  socket.once('error',reject)
})

const collectUntil=(socket,predicate,timeoutMs=1000)=>new Promise((resolve,reject)=>{
  let text=''
  const timer=setTimeout(()=>finish(new Error('SOCKET_TEST_TIMEOUT')),timeoutMs)
  const finish=error=>{
    clearTimeout(timer)
    socket.off('data',onData)
    socket.off('close',onClose)
    error?reject(error):resolve(text)
  }
  const onData=chunk=>{text+=String(chunk);if(predicate(text))finish()}
  const onClose=()=>{if(predicate(text))finish();else finish(new Error('SOCKET_CLOSED_EARLY'))}
  socket.on('data',onData)
  socket.on('close',onClose)
})

test('worker credential authenticates only correct pool worker and secret',()=>{
  const credential=createWorkerCredential({poolId:'pool-1',workerId:'worker-1',memberId:'member-1',secret:'0123456789abcdef'})
  assert.equal(authenticateWorker(credential,{poolId:'pool-1',workerId:'worker-1',secret:'0123456789abcdef'}),true)
  assert.equal(authenticateWorker(credential,{poolId:'pool-2',workerId:'worker-1',secret:'0123456789abcdef'}),false)
  assert.equal(authenticateWorker(credential,{poolId:'pool-1',workerId:'worker-1',secret:'wrong-wrong-wrong'}),false)
})

test('difficulty and compact bits targets are positive',()=>{
  assert.ok(targetFromDifficulty(1)>0n)
  assert.ok(targetFromDifficulty(1024)>0n)
  assert.ok(targetFromBits('1d00ffff')>0n)
})

test('hash target comparison rejects hashes above target',()=>{
  const tiny=1n
  assert.equal(hashMeetsTarget('f'.repeat(64),tiny),false)
})

test('gateway rejects invalid network limits before listening',()=>{
  assert.throws(()=>createStratumGateway({poolId:'pool-1',credentialResolver:async()=>null,jobResolver:async()=>null,shareRecorder:async()=>{},maxLineBytes:0}),/MAX_LINE_BYTES_INVALID/)
})

test('gateway closes an oversized unterminated request',async()=>{
  const gateway=createStratumGateway({host:'127.0.0.1',port:0,poolId:'pool-1',credentialResolver:async()=>null,jobResolver:async()=>null,shareRecorder:async()=>{},maxLineBytes:32,shutdownGraceMs:100})
  await gateway.start()
  const socket=await connect(gateway.server)
  socket.setEncoding('utf8')
  try{
    const response=collectUntil(socket,text=>text.includes('LINE_TOO_LARGE'))
    socket.write('x'.repeat(64))
    assert.match(await response,/LINE_TOO_LARGE/)
  }finally{
    socket.destroy()
    await gateway.stop()
  }
})

test('gateway rate limits repeated share submissions per session',async()=>{
  const secret='0123456789abcdef'
  const credential=createWorkerCredential({poolId:'pool-1',workerId:'worker-1',memberId:'member-1',secret})
  let recorded=0
  const job={jobId:'job-1',templateId:'template-1',difficulty:1,bits:'1d00ffff',stale:false}
  const gateway=createStratumGateway({
    host:'127.0.0.1',port:0,poolId:'pool-1',
    credentialResolver:async workerId=>workerId==='worker-1'?credential:null,
    jobResolver:async jobId=>jobId==='job-1'?job:null,
    shareRecorder:async()=>{recorded+=1},
    shareVerifier:async({raw})=>({...raw,accepted:true,blockCandidate:false}),
    maxSubmissionsPerWindow:1,submitWindowMs:60000,shutdownGraceMs:100
  })
  await gateway.start()
  const socket=await connect(gateway.server)
  socket.setEncoding('utf8')
  try{
    const auth=collectUntil(socket,text=>text.includes('"id":1')&&text.includes('true'))
    socket.write(JSON.stringify({id:1,method:'mining.authorize',params:['worker-1',secret]})+'\n')
    await auth
    const responses=collectUntil(socket,text=>text.includes('SUBMISSION_RATE_LIMITED'))
    const params=['worker-1','job-1','00000001','68b47c00','00000002']
    socket.write(JSON.stringify({id:2,method:'mining.submit',params})+'\n')
    socket.write(JSON.stringify({id:3,method:'mining.submit',params})+'\n')
    const text=await responses
    assert.match(text,/SUBMISSION_RATE_LIMITED/)
    assert.equal(recorded,1)
  }finally{
    socket.destroy()
    await gateway.stop()
  }
})

test('gateway stop closes active sessions within the configured grace period',async()=>{
  const gateway=createStratumGateway({host:'127.0.0.1',port:0,poolId:'pool-1',credentialResolver:async()=>null,jobResolver:async()=>null,shareRecorder:async()=>{},shutdownGraceMs:50})
  await gateway.start()
  const socket=await connect(gateway.server)
  const closed=new Promise(resolve=>socket.once('close',resolve))
  await gateway.stop()
  await closed
  assert.equal(gateway.sessionCount(),0)
})
