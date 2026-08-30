import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import {stratumPrevhashFromBlockHash,blockHashFromStratumPrevhash,reconstructStratumCoinbase} from './stratumV1Wire.mjs'
import {createStratumGateway} from './gatewayCore.mjs'

const connect=server=>new Promise((resolve,reject)=>{
  const address=server.address()
  const socket=net.createConnection({host:'127.0.0.1',port:address.port},()=>resolve(socket))
  socket.once('error',reject)
})

const nextLine=socket=>new Promise((resolve,reject)=>{
  let buffer=''
  const timer=setTimeout(()=>finish(new Error('SOCKET_TEST_TIMEOUT')),1000)
  const finish=(error,value)=>{
    clearTimeout(timer)
    socket.off('data',onData)
    socket.off('close',onClose)
    error?reject(error):resolve(value)
  }
  const onData=chunk=>{
    buffer+=String(chunk)
    const index=buffer.indexOf('\n')
    if(index>=0)finish(null,buffer.slice(0,index))
  }
  const onClose=()=>finish(new Error('SOCKET_CLOSED_EARLY'))
  socket.on('data',onData)
  socket.on('close',onClose)
})

test('Stratum prevhash is the byte-reversed Bitcoin block hash',()=>{
  const blockHash='0000000000000000000b4d0c7c2f0f2a9c8e76543210fedcba9876543210abcd'
  const prevhash=stratumPrevhashFromBlockHash(blockHash)
  assert.equal(prevhash,Buffer.from(blockHash,'hex').reverse().toString('hex'))
  assert.equal(blockHashFromStratumPrevhash(prevhash),blockHash)
})

test('miner-side coinbase reconstruction inserts both extranonces between coinbase parts',()=>{
  assert.equal(reconstructStratumCoinbase({coinbase1:'aa',extranonce1:'01020304',extranonce2:'05060708',coinbase2:'bb'}),'aa0102030405060708bb')
})

test('mining.subscribe returns a per-connection extranonce1 and advertised extranonce2 size',async()=>{
  const gateway=createStratumGateway({host:'127.0.0.1',port:0,poolId:'pool-1',credentialResolver:async()=>null,jobResolver:async()=>null,shareRecorder:async()=>{},extranonce1Bytes:4,extranonce2Size:4,shutdownGraceMs:100})
  await gateway.start()
  const socket=await connect(gateway.server)
  socket.setEncoding('utf8')
  try{
    const responsePromise=nextLine(socket)
    socket.write(JSON.stringify({id:1,method:'mining.subscribe',params:['neo-test/1.0']})+'\n')
    const response=JSON.parse(await responsePromise)
    assert.equal(response.id,1)
    assert.equal(response.error,null)
    assert.equal(response.result[1].length,8)
    assert.match(response.result[1],/^[0-9a-f]{8}$/)
    assert.equal(response.result[2],4)
    assert.equal(response.result[0][0][0],'mining.set_difficulty')
    assert.equal(response.result[0][1][0],'mining.notify')
  }finally{
    socket.destroy()
    await gateway.stop()
  }
})

test('separate Stratum sessions receive distinct extranonce1 prefixes',async()=>{
  const gateway=createStratumGateway({host:'127.0.0.1',port:0,poolId:'pool-1',credentialResolver:async()=>null,jobResolver:async()=>null,shareRecorder:async()=>{},shutdownGraceMs:100})
  await gateway.start()
  const a=await connect(gateway.server),b=await connect(gateway.server)
  a.setEncoding('utf8');b.setEncoding('utf8')
  try{
    const pa=nextLine(a),pb=nextLine(b)
    a.write(JSON.stringify({id:1,method:'mining.subscribe',params:[]})+'\n')
    b.write(JSON.stringify({id:2,method:'mining.subscribe',params:[]})+'\n')
    const [ra,rb]=await Promise.all([pa,pb]).then(lines=>lines.map(JSON.parse))
    assert.notEqual(ra.result[1],rb.result[1])
  }finally{
    a.destroy();b.destroy()
    await gateway.stop()
  }
})
