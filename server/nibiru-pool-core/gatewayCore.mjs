import net from 'node:net'
import {authenticateWorker} from './workerAuth.mjs'
import {validateShareSubmission,classifyVerifiedShare} from './stratumBoundary.mjs'
import {verifyHeaderTargets} from './shareTarget.mjs'

const json=(id,result=null,error=null)=>JSON.stringify({id,result,error})+'\n'

export function createStratumGateway({host='0.0.0.0',port=3333,poolId,credentialResolver,jobResolver,shareRecorder,blockCandidateHandler}={}){
  if(!poolId) throw new Error('POOL_ID_REQUIRED')
  if(typeof credentialResolver!=='function') throw new Error('CREDENTIAL_RESOLVER_REQUIRED')
  if(typeof jobResolver!=='function') throw new Error('JOB_RESOLVER_REQUIRED')
  if(typeof shareRecorder!=='function') throw new Error('SHARE_RECORDER_REQUIRED')

  const server=net.createServer(socket=>{
    socket.setEncoding('utf8')
    let buffer=''
    let authorizedWorker=null
    socket.on('data',async chunk=>{
      buffer+=chunk
      while(buffer.includes('\n')){
        const index=buffer.indexOf('\n')
        const line=buffer.slice(0,index).trim();buffer=buffer.slice(index+1)
        if(!line) continue
        let req
        try{req=JSON.parse(line)}catch{socket.write(json(null,null,{code:20,message:'INVALID_JSON'}));continue}
        try{
          if(req.method==='mining.subscribe'){
            socket.write(json(req.id,[[['mining.notify','neo-nibiru']], '00000000',4]))
            continue
          }
          if(req.method==='mining.authorize'){
            const [workerId,secret]=req.params||[]
            const credential=await credentialResolver(workerId)
            const ok=authenticateWorker(credential,{poolId,workerId,secret})
            if(ok)authorizedWorker=workerId
            socket.write(json(req.id,ok,null));continue
          }
          if(req.method==='mining.submit'){
            if(!authorizedWorker) throw new Error('WORKER_NOT_AUTHORIZED')
            const [workerId,jobId,extranonce2,ntime,nonce,headerHex]=req.params||[]
            if(workerId!==authorizedWorker) throw new Error('WORKER_MISMATCH')
            const job=await jobResolver(jobId)
            if(!job) throw new Error('UNKNOWN_JOB')
            const raw=validateShareSubmission({job,workerId,nonce,ntime,extranonce2,difficulty:job.difficulty||1})
            const verification=verifyHeaderTargets({headerHex,difficulty:job.difficulty||1,bits:job.bits})
            const verified=classifyVerifiedShare(raw,verification)
            await shareRecorder(verified)
            if(verified.blockCandidate&&typeof blockCandidateHandler==='function') await blockCandidateHandler({submission:verified,headerHex})
            socket.write(json(req.id,verified.accepted,null));continue
          }
          socket.write(json(req.id,null,{code:20,message:'UNKNOWN_METHOD'}))
        }catch(error){socket.write(json(req?.id??null,null,{code:20,message:String(error?.message||error)}))}
      }
    })
  })
  return {server,start:()=>new Promise(resolve=>server.listen(port,host,()=>resolve({host,port,poolId}))),stop:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
}
