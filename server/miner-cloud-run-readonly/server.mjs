import http from 'node:http'
import {timingSafeEqual} from 'node:crypto'

const BOOTSTRAP_MODE='READ_ONLY_BOOTSTRAP'
const TELEMETRY_MODE='READ_ONLY_TELEMETRY'

function clean(value){return String(value||'').trim()}
function tokenMatches(header,expectedToken){
  if(!expectedToken||typeof header!=='string'||!header.startsWith('Bearer '))return false
  const actual=Buffer.from(header.slice(7))
  const expected=Buffer.from(expectedToken)
  return actual.length===expected.length&&timingSafeEqual(actual,expected)
}
function telemetryConfig(env){
  const rawUrl=clean(env.NEO_MINER_TELEMETRY_URL)
  const token=clean(env.NEO_MINER_TELEMETRY_TOKEN)
  if(!rawUrl&&!token)return {configured:false,valid:true,url:null,token:null}
  try{
    const url=new URL(rawUrl)
    const valid=url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/snapshot'&&Boolean(token)
    return {configured:true,valid,url:valid?url.toString():null,token:valid?token:null}
  }catch{return {configured:true,valid:false,url:null,token:null}}
}
function number(value,fallback=0){const out=Number(value);return Number.isFinite(out)?out:fallback}
function boolean(value){return value===true}
function safeTelemetry(data={}){
  const miners=data.miners&&typeof data.miners==='object'?data.miners:{}
  const bitcoin=data.bitcoin&&typeof data.bitcoin==='object'?data.bitcoin:{}
  const pool=data.pool&&typeof data.pool==='object'?data.pool:{}
  const incidents=data.incidents&&typeof data.incidents==='object'?data.incidents:{}
  return {
    service:'neo-miner',
    status:'TELEMETRY_CONNECTED',
    mode:TELEMETRY_MODE,
    mutates:false,
    liveMining:false,
    upstreamStatus:typeof data.status==='string'?data.status.slice(0,80):null,
    bitcoinConnected:boolean(bitcoin.connected??data.bitcoinConnected),
    bitcoinHeight:Number.isFinite(Number(bitcoin.height??data.bitcoinHeight))?number(bitcoin.height??data.bitcoinHeight):null,
    poolConnected:boolean(pool.connected??data.poolConnected),
    minersOnline:number(miners.online??data.minersOnline),
    verifiedMinerAgents:number(miners.verifiedAgents??data.verifiedMinerAgents),
    fleetHashrateTh:number(miners.hashrateTh??data.fleetHashrateTh),
    incidents:{open:number(incidents.open)},
    generatedAt:typeof data.generatedAt==='string'?data.generatedAt.slice(0,80):new Date().toISOString(),
    note:'Allowlisted read-only telemetry; financial records, credentials and controls are excluded.'
  }
}
function bootstrapSnapshot(status='BOOTSTRAP_NOT_LIVE'){
  return {service:'neo-miner',status,mode:BOOTSTRAP_MODE,mutates:false,liveMining:false,bitcoinConnected:false,poolConnected:false,minersOnline:0,fleetHashrateTh:0,incidents:{open:0},note:'Protected bootstrap telemetry only; mining and financial controls are not deployed.'}
}
async function telemetrySnapshot(env,fetchImpl){
  const config=telemetryConfig(env)
  if(!config.configured)return bootstrapSnapshot()
  if(!config.valid)return bootstrapSnapshot('UPSTREAM_CONFIGURATION_INVALID')
  try{
    const response=await fetchImpl(config.url,{method:'GET',headers:{accept:'application/json',authorization:`Bearer ${config.token}`},redirect:'error',signal:AbortSignal.timeout(8000)})
    if(!response.ok)return bootstrapSnapshot(`UPSTREAM_HTTP_${response.status}`)
    const data=await response.json()
    if(!data||typeof data!=='object'||Array.isArray(data))return bootstrapSnapshot('UPSTREAM_RESPONSE_INVALID')
    return safeTelemetry(data)
  }catch{return bootstrapSnapshot('UPSTREAM_UNREACHABLE')}
}
function respond(res,status,body,extra={}){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...extra})
  res.end(JSON.stringify(body))
}
function requestPath(req){try{return new URL(req.url||'/','http://localhost').pathname}catch{return null}}

export function createServer({env=process.env,fetchImpl=fetch}={}){
  const operatorToken=clean(env.NEO_MINER_OPERATOR_TOKEN)
  return http.createServer(async(req,res)=>{
    const path=requestPath(req)
    if(path===null)return respond(res,400,{error:'INVALID_REQUEST_TARGET'})
    if(req.method==='GET'&&path==='/health'){
      const config=telemetryConfig(env)
      return respond(res,200,{service:'neo-miner-readonly',status:'UP',mode:config.configured?TELEMETRY_MODE:BOOTSTRAP_MODE,telemetryConfigured:config.configured&&config.valid})
    }
    if(path==='/discord/snapshot'){
      if(req.method!=='GET')return respond(res,405,{error:'METHOD_NOT_ALLOWED'},{allow:'GET'})
      if(!operatorToken)return respond(res,503,{error:'OPERATOR_READ_TOKEN_NOT_CONFIGURED'})
      if(!tokenMatches(req.headers.authorization,operatorToken))return respond(res,401,{error:'UNAUTHORIZED'})
      return respond(res,200,await telemetrySnapshot(env,fetchImpl))
    }
    return respond(res,404,{error:'NOT_FOUND'})
  })
}
export function start(env=process.env){
  if(!clean(env.NEO_MINER_OPERATOR_TOKEN))throw new Error('NEO_MINER_OPERATOR_TOKEN is required')
  const port=Number(env.PORT||8080)
  return createServer({env}).listen(port,'0.0.0.0',()=>console.log(`NEO Miner read-only adapter listening on ${port}`))
}
if(import.meta.url===`file://${process.argv[1]}`){try{start()}catch(error){console.error(error.message);process.exitCode=1}}
