import net from 'node:net'
import {authenticateWorker} from './workerAuth.mjs'
import {validateShareSubmission,classifyVerifiedShare} from './stratumBoundary.mjs'
import {verifyHeaderTargets} from './shareTarget.mjs'

const json=(id,result=null,error=null)=>JSON.stringify({id,result,error})+'\n'
const event=payload=>JSON.stringify(payload)+'\n'
const positiveInteger=(value,name)=>{
  const parsed=Number(value)
  if(!Number.isSafeInteger(parsed)||parsed<=0)throw new Error(`${name}_INVALID`)
  return parsed
}

export function createStratumGateway({
  host='127.0.0.1',
  port=3333,
  poolId,
  credentialResolver,
  jobResolver,
  shareRecorder,
  blockCandidateHandler,
  notifyResolver,
  difficultyResolver,
  shareVerifier,
  maxConnections=128,
  maxLineBytes=16*1024,
  idleTimeoutMs=120000,
  submitWindowMs=1000,
  maxSubmissionsPerWindow=64,
  shutdownGraceMs=3000
}={}){
  if(!poolId) throw new Error('POOL_ID_REQUIRED')
  if(typeof credentialResolver!=='function') throw new Error('CREDENTIAL_RESOLVER_REQUIRED')
  if(typeof jobResolver!=='function') throw new Error('JOB_RESOLVER_REQUIRED')
  if(typeof shareRecorder!=='function') throw new Error('SHARE_RECORDER_REQUIRED')

  const limits=Object.freeze({
    maxConnections:positiveInteger(maxConnections,'MAX_CONNECTIONS'),
    maxLineBytes:positiveInteger(maxLineBytes,'MAX_LINE_BYTES'),
    idleTimeoutMs:positiveInteger(idleTimeoutMs,'IDLE_TIMEOUT_MS'),
    submitWindowMs:positiveInteger(submitWindowMs,'SUBMIT_WINDOW_MS'),
    maxSubmissionsPerWindow:positiveInteger(maxSubmissionsPerWindow,'MAX_SUBMISSIONS_PER_WINDOW'),
    shutdownGraceMs:positiveInteger(shutdownGraceMs,'SHUTDOWN_GRACE_MS')
  })
  const sessions=new Set()
  let stopping=false

  const sendToAuthorized=payload=>{
    for(const session of sessions){
      if(!session.authorizedWorker||session.socket.destroyed)continue
      session.socket.write(event(payload))
    }
  }

  function rejectAndClose(socket,message){
    if(socket.destroyed)return
    try{socket.end(json(null,null,{code:20,message}))}catch{}
    setImmediate(()=>{if(!socket.destroyed)socket.destroy()})
  }

  function assertSubmissionRate(session){
    const at=Date.now()
    if(at-session.submitWindowStartedAt>=limits.submitWindowMs){
      session.submitWindowStartedAt=at
      session.submitCount=0
    }
    session.submitCount+=1
    if(session.submitCount>limits.maxSubmissionsPerWindow)throw new Error('SUBMISSION_RATE_LIMITED')
  }

  async function handleRequest(session,line){
    const {socket}=session
    if(Buffer.byteLength(line,'utf8')>limits.maxLineBytes){
      rejectAndClose(socket,'LINE_TOO_LARGE')
      return
    }
    let req
    try{req=JSON.parse(line)}catch{socket.write(json(null,null,{code:20,message:'INVALID_JSON'}));return}
    try{
      if(req.method==='mining.subscribe'){
        session.subscribed=true
        socket.write(json(req.id,[[['mining.notify','neo-nibiru']], '00000000',4]))
        return
      }
      if(req.method==='mining.authorize'){
        const [workerId,secret]=req.params||[]
        const credential=await credentialResolver(workerId)
        const ok=authenticateWorker(credential,{poolId,workerId,secret})
        if(ok){
          session.authorizedWorker=workerId
          if(typeof difficultyResolver==='function')socket.write(event(difficultyResolver()))
          if(typeof notifyResolver==='function')socket.write(event(notifyResolver()))
        }
        socket.write(json(req.id,ok,null))
        return
      }
      if(req.method==='mining.submit'){
        assertSubmissionRate(session)
        if(!session.authorizedWorker) throw new Error('WORKER_NOT_AUTHORIZED')
        const [workerId,jobId,extranonce2,ntime,nonce,headerHex] = req.params||[]
        if(workerId!==session.authorizedWorker) throw new Error('WORKER_MISMATCH')
        const job=await jobResolver(jobId)
        if(!job) throw new Error('STALE_OR_UNKNOWN_JOB')
        if(job.stale) throw new Error('STALE_JOB')
        const raw=validateShareSubmission({job,workerId,nonce,ntime,extranonce2,difficulty:job.difficulty||1})
        let verified
        if(typeof shareVerifier==='function'){
          const result=await shareVerifier({job,workerId,jobId,extranonce2,ntime,nonce,raw})
          verified=Object.freeze({...raw,...result,verified:true})
        }else{
          const verification=verifyHeaderTargets({headerHex,difficulty:job.difficulty||1,bits:job.bits})
          verified=classifyVerifiedShare(raw,verification)
        }
        await shareRecorder(verified)
        if(verified.blockCandidate&&typeof blockCandidateHandler==='function') await blockCandidateHandler({submission:verified,headerHex})
        socket.write(json(req.id,verified.accepted,null))
        return
      }
      socket.write(json(req.id,null,{code:20,message:'UNKNOWN_METHOD'}))
    }catch(error){
      socket.write(json(req?.id??null,null,{code:20,message:String(error?.message||error)}))
    }
  }

  const server=net.createServer(socket=>{
    if(stopping||sessions.size>=limits.maxConnections){
      rejectAndClose(socket,stopping?'SERVER_SHUTTING_DOWN':'MAX_CONNECTIONS_REACHED')
      return
    }
    socket.setEncoding('utf8')
    socket.setTimeout(limits.idleTimeoutMs)
    let buffer=''
    let processing=Promise.resolve()
    const session={socket,authorizedWorker:null,subscribed:false,submitWindowStartedAt:Date.now(),submitCount:0}
    sessions.add(session)
    const remove=()=>sessions.delete(session)
    socket.on('close',remove)
    socket.on('error',remove)
    socket.on('timeout',()=>rejectAndClose(socket,'SESSION_IDLE_TIMEOUT'))
    socket.on('data',chunk=>{
      buffer+=chunk
      if(!buffer.includes('\n')&&Buffer.byteLength(buffer,'utf8')>limits.maxLineBytes){
        buffer=''
        rejectAndClose(socket,'LINE_TOO_LARGE')
        return
      }
      const lines=[]
      while(buffer.includes('\n')){
        const index=buffer.indexOf('\n')
        const line=buffer.slice(0,index).trim()
        buffer=buffer.slice(index+1)
        if(line)lines.push(line)
      }
      for(const line of lines){
        processing=processing.then(()=>handleRequest(session,line)).catch(()=>rejectAndClose(socket,'SESSION_PROCESSING_ERROR'))
      }
    })
  })
  server.maxConnections=limits.maxConnections

  function stop(){
    stopping=true
    return new Promise((resolve,reject)=>{
      let settled=false
      const finish=error=>{
        if(settled)return
        settled=true
        clearTimeout(forceTimer)
        error?reject(error):resolve()
      }
      const forceTimer=setTimeout(()=>{
        for(const session of sessions)session.socket.destroy()
      },limits.shutdownGraceMs)
      for(const session of sessions){
        if(!session.socket.destroyed)session.socket.end()
      }
      if(!server.listening){
        for(const session of sessions)session.socket.destroy()
        finish()
        return
      }
      server.close(error=>{
        if(error&&error.code!=='ERR_SERVER_NOT_RUNNING')finish(error)
        else finish()
      })
    })
  }

  return Object.freeze({
    server,
    start:()=>new Promise((resolve,reject)=>{
      stopping=false
      const onError=error=>{server.off('listening',onListening);reject(error)}
      const onListening=()=>{server.off('error',onError);resolve({host,port,poolId,limits})}
      server.once('error',onError)
      server.once('listening',onListening)
      server.listen(port,host)
    }),
    stop,
    broadcastNotify:payload=>sendToAuthorized(payload),
    broadcastDifficulty:payload=>sendToAuthorized(payload),
    sessionCount:()=>sessions.size,
    limits:()=>limits
  })
}
