import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import process from 'node:process'
import {spawn} from 'node:child_process'
import {discoverMiners} from '../miner-agent/discovery.mjs'

const now=()=>new Date().toISOString()

export async function loadControllerConfig(path){
  const cfg=JSON.parse(await fs.readFile(path,'utf8'))
  for(const key of ['listenHost','listenPort','agentConfigPath']) if(cfg[key]===undefined) throw new Error(`Missing controller config: ${key}`)
  return cfg
}

export function controllerSnapshot({startedAt,agentState='UNKNOWN',lastAgentHeartbeat=null,discovered=[]}={}){
  return {product:'NEO Miner Controller',version:'0.8.0',hostname:os.hostname(),platform:process.platform,arch:process.arch,uptimeSeconds:Math.floor(process.uptime()),startedAt:startedAt||now(),agentState,lastAgentHeartbeat,discoveredMiners:discovered,timestamp:now()}
}

function dashboardHtml(){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEO Miner</title></head><body style="font-family:system-ui;background:#071011;color:#e9f5f2;padding:24px"><h1>NEO Miner</h1><p>Secure Omnitrix telemetry adapter is running.</p></body></html>`}

function corsHeaders(config,req){
  const origin=req.headers.origin||''
  const allowed=config.allowedOrigins||[]
  const allow=allowed.includes('*')?'*':allowed.includes(origin)?origin:null
  return allow?{'access-control-allow-origin':allow,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS','vary':'origin'}:{}
}

function authorized(config,req){
  const expected=String(config.authToken||process.env.NEO_MINER_CONTROLLER_TOKEN||'').trim()
  if(!expected) return true
  const header=String(req.headers.authorization||'')
  return header===`Bearer ${expected}`
}

export function createLocalApi({config,getState,runDiscovery}){
  return http.createServer(async(req,res)=>{
    const cors=corsHeaders(config,req)
    const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',...cors});res.end(JSON.stringify(data))}
    if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end()}
    if(req.method==='GET'&&(req.url==='/'||req.url==='/dashboard')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store',...cors});return res.end(dashboardHtml())}
    if(req.method==='GET'&&req.url==='/health') return send(200,{ok:true,service:'neo-miner-controller',version:'0.8.0',authRequired:Boolean(config.authToken||process.env.NEO_MINER_CONTROLLER_TOKEN),time:now()})
    if(!authorized(config,req)) return send(401,{ok:false,error:'Unauthorized'})
    if(req.method==='GET'&&req.url==='/status') return send(200,getState())
    if(req.method==='POST'&&req.url==='/discover'){
      if(!config.allowLocalDiscovery) return send(403,{ok:false,error:'Local discovery disabled'})
      try{return send(200,{ok:true,devices:await runDiscovery()})}catch(error){return send(500,{ok:false,error:error instanceof Error?error.message:String(error)})}
    }
    return send(404,{ok:false,error:'Not found'})
  })
}

export async function runController(config,{spawnImpl=spawn,discoverImpl=discoverMiners}={}){
  const startedAt=now();let agentState='STARTING';let lastAgentHeartbeat=null;let discovered=[];let child=null;let restartTimer=null
  const launchAgent=()=>{child=spawnImpl(process.execPath,['server/miner-agent/agent.mjs',config.agentConfigPath],{stdio:'inherit',env:process.env});agentState='RUNNING';lastAgentHeartbeat=now();child.on?.('exit',(code)=>{agentState=code===0?'STOPPED':'FAILED';if(config.watchdog?.enabled){clearTimeout(restartTimer);restartTimer=setTimeout(launchAgent,Number(config.watchdog.restartDelayMs||3000))}})}
  const runDiscovery=async()=>{discovered=await discoverImpl(config.discovery||{});return discovered}
  const getState=()=>controllerSnapshot({startedAt,agentState,lastAgentHeartbeat,discovered})
  const api=createLocalApi({config,getState,runDiscovery});api.listen(Number(config.listenPort),config.listenHost);launchAgent()
  const stop=()=>{clearTimeout(restartTimer);child?.kill?.('SIGTERM');api.close()}
  return {stop,getState,runDiscovery,api}
}

async function main(){const path=process.env.NEO_MINER_CONTROLLER_CONFIG||process.argv[2]||'server/miner-controller/config.example.json';const config=await loadControllerConfig(path);const controller=await runController(config);const shutdown=()=>controller.stop();process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown)}
if(import.meta.url===`file://${process.argv[1]}`) main().catch(error=>{console.error(error);process.exitCode=1})
