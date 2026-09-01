import http from 'node:http'
import {timingSafeEqual} from 'node:crypto'

const PORT=Number(process.env.PORT||8080)
const TOKEN=String(process.env.NEO_MINER_OPERATOR_TOKEN||'')
const MODE='READ_ONLY_BOOTSTRAP'

function tokenMatches(header){
  if(!TOKEN||typeof header!=='string'||!header.startsWith('Bearer '))return false
  const actual=Buffer.from(header.slice(7))
  const expected=Buffer.from(TOKEN)
  return actual.length===expected.length&&timingSafeEqual(actual,expected)
}

function respond(res,status,body,extra={}){
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer',
    ...extra
  })
  res.end(JSON.stringify(body))
}

export function createServer(){
  return http.createServer((req,res)=>{
    const path=new URL(req.url||'/', 'http://localhost').pathname
    if(req.method==='GET'&&path==='/health'){
      return respond(res,200,{service:'neo-miner-readonly',status:'UP',mode:MODE})
    }
    if(path==='/discord/snapshot'){
      if(req.method!=='GET')return respond(res,405,{error:'METHOD_NOT_ALLOWED'},{allow:'GET'})
      if(!TOKEN)return respond(res,503,{error:'OPERATOR_READ_TOKEN_NOT_CONFIGURED'})
      if(!tokenMatches(req.headers.authorization))return respond(res,401,{error:'UNAUTHORIZED'})
      return respond(res,200,{
        service:'neo-miner',
        status:'UP',
        mode:MODE,
        mutates:false,
        liveMining:false,
        bitcoinConnected:false,
        poolConnected:false,
        minersOnline:0,
        fleetHashrateTh:0,
        incidents:{open:0},
        note:'Protected bootstrap telemetry only; mining and financial controls are not deployed.'
      })
    }
    return respond(res,404,{error:'NOT_FOUND'})
  })
}

export function start(){
  if(!TOKEN)throw new Error('NEO_MINER_OPERATOR_TOKEN is required')
  return createServer().listen(PORT,'0.0.0.0',()=>{
    console.log(`NEO Miner read-only adapter listening on ${PORT}`)
  })
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{start()}catch(error){console.error(error.message);process.exitCode=1}
}
