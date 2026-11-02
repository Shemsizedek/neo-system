import { createServer } from 'node:http'
import { createPressHttpHandler } from './http.mjs'

// Explicitly a loopback-only integration harness. It cannot bind to a public
// interface, and deliberately does not read any live secrets or production DB.
export function createLocalPressStaging({
  allowLocalTest=false, mode, store, mediaStore, authService, accessRegistry,
  jwtSecret, now, allowedOrigins=new Set(['http://127.0.0.1'])
} = {}) {
  if(allowLocalTest!==true || mode!=='EPHEMERAL_TEST_ONLY' ||
    !store || !authService || !accessRegistry || !jwtSecret || jwtSecret.length<32 ||
    process.env.NEO_PRESS_PRODUCTION_ENABLED === 'true') throw new Error('local_staging_not_authorized')
  const handler=createPressHttpHandler({
    enabled:true, store, mediaStore, authService, accessRegistry, jwtSecret, now, allowedOrigins
  })
  const server=createServer(async(req,res)=>{
    try {
      const handled=await handler(req,res)
      if (!handled){res.writeHead(404,{'cache-control':'no-store'});res.end()}
    } catch {
      if(!res.headersSent){res.writeHead(503,{'cache-control':'no-store'});res.end()}
      else res.destroy()
    }
  })
  return Object.freeze({
    server,
    async start(){
      if(server.listening)throw new Error('local_staging_already_running')
      await new Promise((resolve,reject)=>{
        server.once('error',reject)
        server.listen(0,'127.0.0.1',()=>{
          server.off('error',reject);resolve()
        })
      })
      return Object.freeze({
        origin:'http://127.0.0.1:'+server.address().port,
        host:'127.0.0.1', runtime:'LOCAL_TEST_ONLY',
        productionConnected:false, genuineNoogleLoginVerified:false,
        originalEvidenceLoaded:false, deploymentPerformed:false
      })
    },
    async stop(){
      if(!server.listening)return
      await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))
    }
  })
}
