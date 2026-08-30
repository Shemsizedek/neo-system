import net from 'node:net'
import {dsha256,serializeHeader,applyMerkleBranch} from './blockPrimitives.mjs'
import {blockHashFromStratumPrevhash,reconstructStratumCoinbase} from './stratumV1Wire.mjs'
import {targetFromDifficulty} from './difficultyController.mjs'

const txidFromRaw=rawHex=>Buffer.from(dsha256(Buffer.from(rawHex,'hex'))).reverse().toString('hex')
const arg=name=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)||null

export function assembleStratumHeader({notify,extranonce1,extranonce2,nonce}={}){
  if(!notify||notify.method!=='mining.notify')throw new Error('MINING_NOTIFY_REQUIRED')
  const [jobId,prevhash,coinbase1,coinbase2,merkleBranch,versionHex,bits,ntime]=notify.params||[]
  const coinbaseHex=reconstructStratumCoinbase({coinbase1,extranonce1,extranonce2,coinbase2})
  const coinbaseTxid=txidFromRaw(coinbaseHex)
  const merkleRoot=applyMerkleBranch(coinbaseTxid,merkleBranch||[])
  const previousBlockHash=blockHashFromStratumPrevhash(prevhash)
  const header=serializeHeader({
    version:Number.parseInt(versionHex,16),
    previousBlockHash,
    merkleRoot,
    time:Number.parseInt(ntime,16),
    bits,
    nonce:Number.parseInt(nonce,16)
  })
  const hash=Buffer.from(dsha256(header)).reverse().toString('hex')
  return Object.freeze({jobId,ntime,nonce,coinbaseHex,coinbaseTxid,merkleRoot,previousBlockHash,headerHex:header.toString('hex'),hash})
}

export function findReferenceShare({notify,extranonce1,extranonce2='00000000',difficulty,maxNonce=1_000_000}={}){
  const target=targetFromDifficulty(difficulty)
  for(let value=0;value<=maxNonce;value++){
    const nonce=value.toString(16).padStart(8,'0')
    const assembled=assembleStratumHeader({notify,extranonce1,extranonce2,nonce})
    if(BigInt(`0x${assembled.hash}`)<=target)return Object.freeze({...assembled,extranonce2,difficulty:String(difficulty)})
  }
  throw new Error('REFERENCE_SHARE_NOT_FOUND')
}

export function createReferenceMinerClient({host='127.0.0.1',port=3333,workerId,secret,timeoutMs=8000,maxNonce=1_000_000}={}){
  if(!workerId||!secret)throw new Error('WORKER_ID_AND_SECRET_REQUIRED')
  return new Promise((resolve,reject)=>{
    const socket=net.createConnection({host,port})
    socket.setEncoding('utf8')
    socket.setTimeout(timeoutMs)
    let buffer=''
    let extranonce1=null
    let extranonce2Size=null
    let difficulty=null
    let notify=null
    let authorized=false
    let submitted=false
    let share=null
    let settled=false
    const finish=(error,result)=>{
      if(settled)return
      settled=true
      socket.destroy()
      error?reject(error):resolve(result)
    }
    const maybeSubmit=()=>{
      if(submitted||!authorized||!extranonce1||!extranonce2Size||!difficulty||!notify)return
      submitted=true
      try{
        const extranonce2='00'.repeat(Number(extranonce2Size))
        share=findReferenceShare({notify,extranonce1,extranonce2,difficulty,maxNonce})
        socket.write(`${JSON.stringify({id:3,method:'mining.submit',params:[workerId,share.jobId,share.extranonce2,share.ntime,share.nonce]})}\n`)
      }catch(error){finish(error)}
    }
    socket.on('connect',()=>{
      socket.write(`${JSON.stringify({id:1,method:'mining.subscribe',params:['neo-reference-miner/1.0']})}\n`)
      socket.write(`${JSON.stringify({id:2,method:'mining.authorize',params:[workerId,secret]})}\n`)
    })
    socket.on('data',chunk=>{
      buffer+=chunk
      while(buffer.includes('\n')){
        const index=buffer.indexOf('\n')
        const line=buffer.slice(0,index).trim();buffer=buffer.slice(index+1)
        if(!line)continue
        let msg
        try{msg=JSON.parse(line)}catch{continue}
        if(msg.id===1&&Array.isArray(msg.result)){
          extranonce1=msg.result[1]
          extranonce2Size=msg.result[2]
        }else if(msg.id===2){
          if(msg.result!==true)return finish(new Error('REFERENCE_MINER_AUTH_FAILED'))
          authorized=true
        }else if(msg.method==='mining.set_difficulty'){
          difficulty=msg.params?.[0]
        }else if(msg.method==='mining.notify'){
          notify=msg
        }else if(msg.id===3){
          if(msg.error)return finish(new Error(`REFERENCE_SHARE_REJECTED:${msg.error.message||'UNKNOWN'}`))
          if(msg.result!==true)return finish(new Error('REFERENCE_SHARE_REJECTED'))
          return finish(null,Object.freeze({ok:true,host,port,workerId,extranonce1,extranonce2Size,difficulty,share}))
        }
        maybeSubmit()
      }
    })
    socket.on('timeout',()=>finish(new Error('REFERENCE_MINER_TIMEOUT')))
    socket.on('error',error=>finish(error))
    socket.on('close',()=>{if(!settled)finish(new Error('REFERENCE_MINER_CONNECTION_CLOSED'))})
  })
}

if(import.meta.url===`file://${process.argv[1]}`){
  const workerId=arg('worker')||process.env.NIBIRU_REFERENCE_WORKER
  const secret=arg('secret')||process.env.NIBIRU_REFERENCE_SECRET
  const host=arg('host')||process.env.NIBIRU_STRATUM_HOST||'127.0.0.1'
  const port=Number(arg('port')||process.env.NIBIRU_STRATUM_PORT||3333)
  const maxNonce=Number(arg('max-nonce')||1_000_000)
  try{
    const result=await createReferenceMinerClient({host,port,workerId,secret,maxNonce})
    process.stdout.write(`${JSON.stringify({...result,share:{jobId:result.share.jobId,nonce:result.share.nonce,hash:result.share.hash,difficulty:result.share.difficulty}},null,2)}\n`)
  }catch(error){
    process.stderr.write(`[reference-miner] ${String(error?.message||error)}\n`)
    process.exitCode=1
  }
}
