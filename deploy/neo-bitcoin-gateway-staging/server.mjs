import http from 'node:http'
import {pathToFileURL} from 'node:url'
import {createBitcoinGatewayHandler} from '../../server/neo-platform-api/bitcoin-gateway.mjs'

// Isolated public staging shell. It is NOT an RPC bridge, simulator for real
// funds, or a mainnet node. Network execution remains disabled in all cases.
export function createBitcoinGatewayStagingServer({now=()=>new Date().toISOString()}={}){
  const handleBitcoin=createBitcoinGatewayHandler({enabled:false,now})
  const respond=(res,status,payload)=>{
    const body=JSON.stringify(payload)
    res.writeHead(status,{
      'content-type':'application/json; charset=utf-8',
      'content-length':Buffer.byteLength(body),
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer',
      'content-security-policy':"default-src 'none'",
      'x-frame-options':'DENY'
    })
    res.end(body)
  }
  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url||'/','http://localhost')
      if(req.method==='GET' && url.pathname==='/healthz'){
        return respond(res,200,{service:'neo-bitcoin-gateway-staging',
          status:'running',bitcoinRpc:'not_configured',
          bitcoinAccess:'disabled',liveMainnet:false,observedAt:now()})
      }
      if(await handleBitcoin(req,res,url))return
      respond(res,404,{error:'not_found'})
    }catch{
      if(!res.headersSent)respond(res,500,{error:'staging_error'})
      else res.end()
    }
  })
}
export function startBitcoinGatewayStaging({port=Number(process.env.PORT||10000)}={}){
  const server=createBitcoinGatewayStagingServer()
  server.listen(port,'0.0.0.0',()=>{
    process.stdout.write('[neo-bitcoin-gateway-staging] started; Bitcoin access disabled\n')
  })
  return server
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  startBitcoinGatewayStaging()
