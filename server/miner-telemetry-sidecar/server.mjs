import http from 'node:http'
import {timingSafeEqual} from 'node:crypto'

const clean=value=>String(value||'').trim()
const LOOPBACK=new Set(['127.0.0.1','localhost','[::1]','::1'])

export function validateConfig(env=process.env){
  const publicToken=clean(env.NEO_MINER_TELEMETRY_TOKEN)
  const internalToken=clean(env.NEO_MINER_API_TOKEN)
  const rawUrl=clean(env.NEO_MINER_INTERNAL_SNAPSHOT_URL||'http://127.0.0.1:8890/snapshot')
  if(!/^[0-9a-f]{64}$/i.test(publicToken))throw new Error('NEO_MINER_TELEMETRY_TOKEN_64_HEX_REQUIRED')
  if(!internalToken)throw new Error('NEO_MINER_API_TOKEN_REQUIRED')
  const url=new URL(rawUrl)
  if(!['http:','https:'].includes(url.protocol)||!LOOPBACK.has(url.hostname)||url.pathname!=='/snapshot'||url.username||url.password||url.search||url.hash){
    throw new Error('INTERNAL_SNAPSHOT_URL_MUST_BE_LOOPBACK_EXACT_SNAPSHOT')
  }
  return {publicToken,internalToken,url:url.toString()}
}
function authorized(header,expected){
  if(typeof header!=='string'||!header.startsWith('Bearer '))return false
  const actual=Buffer.from(header.slice(7))
  const wanted=Buffer.from(expected)
  return actual.length===wanted.length&&timingSafeEqual(actual,wanted)
}
const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback
function allowlist(data={}){
  const miners=data.miners&&typeof data.miners==='object'?data.miners:{}
  const bitcoin=data.bitcoin&&typeof data.bitcoin==='object'?data.bitcoin:{}
  const pool=data.pool&&typeof data.pool==='object'?data.pool:{}
  const incidents=data.incidents&&typeof data.incidents==='object'?data.incidents:{}
  return {
    status:typeof data.status==='string'?data.status.slice(0,80):'UNKNOWN',
    bitcoin:{connected:bitcoin.connected===true||data.bitcoinConnected===true,height:Number.isFinite(Number(bitcoin.height??data.bitcoinHeight))?num(bitcoin.height??data.bitcoinHeight):null},
    pool:{connected:pool.connected===true||data.poolConnected===true},
    miners:{online:num(miners.online??data.minersOnline),verifiedAgents:num(miners.verifiedAgents??data.verifiedMinerAgents),hashrateTh:num(miners.hashrateTh??data.fleetHashrateTh)},
    incidents:{open:num(incidents.open)},
    generatedAt:typeof data.generatedAt==='string'?data.generatedAt.slice(0,80):new Date().toISOString()
  }
}
function send(res,status,body,extra={}){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...extra})
  res.end(JSON.stringify(body))
}
function pathOf(req){try{return new URL(req.url||'/','http://localhost').pathname}catch{return null}}

export function createServer({env=process.env,fetchImpl=fetch}={}){
  const config=validateConfig(env)
  return http.createServer(async(req,res)=>{
    const path=pathOf(req)
    if(path===null)return send(res,400,{error:'INVALID_REQUEST_TARGET'})
    if(req.method==='GET'&&path==='/health')return send(res,200,{service:'neo-miner-telemetry-sidecar',status:'UP',mutates:false})
    if(path==='/snapshot'){
      if(req.method!=='GET')return send(res,405,{error:'METHOD_NOT_ALLOWED'},{allow:'GET'})
      if(!authorized(req.headers.authorization,config.publicToken))return send(res,401,{error:'UNAUTHORIZED'})
      try{
        const response=await fetchImpl(config.url,{method:'GET',headers:{accept:'application/json',authorization:`Bearer ${config.internalToken}`},redirect:'error',signal:AbortSignal.timeout(8000)})
        if(!response.ok)return send(res,503,{error:'INTERNAL_SNAPSHOT_UNAVAILABLE',status:response.status})
        const data=await response.json()
        if(!data||typeof data!=='object'||Array.isArray(data))return send(res,503,{error:'INTERNAL_SNAPSHOT_INVALID'})
        return send(res,200,allowlist(data))
      }catch{return send(res,503,{error:'INTERNAL_SNAPSHOT_UNREACHABLE'})}
    }
    return send(res,404,{error:'NOT_FOUND'})
  })
}
export function start(env=process.env){
  const port=Number(env.PORT||8891)
  const host=clean(env.HOST||'127.0.0.1')
  const server=createServer({env})
  return server.listen(port,host,()=>console.log(`NEO Miner telemetry sidecar listening on ${host}:${port}`))
}
if(import.meta.url===`file://${process.argv[1]}`){try{start()}catch(error){console.error(error.message);process.exitCode=1}}
