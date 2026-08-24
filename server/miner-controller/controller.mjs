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
  return {
    product:'NEO Miner Controller',
    version:'0.7.0',
    hostname:os.hostname(),
    platform:process.platform,
    arch:process.arch,
    uptimeSeconds:Math.floor(process.uptime()),
    startedAt:startedAt||now(),
    agentState,
    lastAgentHeartbeat,
    discoveredMiners:discovered,
    timestamp:now()
  }
}

function dashboardHtml(){
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEO Miner Controller</title><style>body{margin:0;font-family:system-ui;background:#071011;color:#e9f5f2}main{max-width:880px;margin:40px auto;padding:20px}.card{background:#0d191b;border:1px solid #203637;border-radius:14px;padding:20px;margin-bottom:14px}h1{margin:0 0 6px}.muted{color:#7f9997}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.kpi{background:#091315;border:1px solid #183031;border-radius:10px;padding:12px}.kpi b{display:block;font-size:20px;margin-top:5px}.ok{color:#6fe0d1}.warn{color:#e8bd70}button{background:#54dacb;border:0;border-radius:8px;padding:10px 14px;font-weight:800;cursor:pointer}@media(max-width:700px){.grid{grid-template-columns:1fr 1fr}}</style></head><body><main><div class="card"><div class="muted">NEO MINER CONTROLLER • LOCAL APPLIANCE</div><h1>ORIGIN Edge Console</h1><p class="muted">Local status only. Keep this interface on localhost or a trusted management network.</p></div><div class="grid"><div class="kpi">Agent<b id="agent">—</b></div><div class="kpi">Host<b id="host">—</b></div><div class="kpi">Uptime<b id="uptime">—</b></div><div class="kpi">ASICs<b id="devices">—</b></div></div><div class="card"><button id="discover">Discover ASICs</button><pre id="detail" class="muted">Loading…</pre></div></main><script>async function refresh(){const r=await fetch('/status');const s=await r.json();agent.textContent=s.agentState;host.textContent=s.hostname;uptime.textContent=Math.floor(s.uptimeSeconds/60)+' min';devices.textContent=s.discoveredMiners.length;detail.textContent=JSON.stringify(s,null,2)}discover.onclick=async()=>{discover.disabled=true;await fetch('/discover',{method:'POST'});await refresh();discover.disabled=false};refresh();setInterval(refresh,5000)</script></body></html>`
}

export function createLocalApi({config,getState,runDiscovery}){
  return http.createServer(async(req,res)=>{
    const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data))}
    if(req.method==='GET'&&(req.url==='/'||req.url==='/dashboard')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(dashboardHtml())}
    if(req.method==='GET'&&req.url==='/health') return send(200,{ok:true,service:'neo-miner-controller',time:now()})
    if(req.method==='GET'&&req.url==='/status') return send(200,getState())
    if(req.method==='POST'&&req.url==='/discover'){
      if(!config.allowLocalDiscovery) return send(403,{ok:false,error:'Local discovery disabled'})
      try{return send(200,{ok:true,devices:await runDiscovery()})}catch(error){return send(500,{ok:false,error:error instanceof Error?error.message:String(error)})}
    }
    return send(404,{ok:false,error:'Not found'})
  })
}

export async function runController(config,{spawnImpl=spawn,discoverImpl=discoverMiners}={}){
  const startedAt=now()
  let agentState='STARTING'
  let lastAgentHeartbeat=null
  let discovered=[]
  let child=null
  let restartTimer=null

  const launchAgent=()=>{
    child=spawnImpl(process.execPath,['server/miner-agent/agent.mjs',config.agentConfigPath],{stdio:'inherit',env:process.env})
    agentState='RUNNING'
    lastAgentHeartbeat=now()
    child.on?.('exit',(code)=>{
      agentState=code===0?'STOPPED':'FAILED'
      if(config.watchdog?.enabled){
        clearTimeout(restartTimer)
        restartTimer=setTimeout(launchAgent,Number(config.watchdog.restartDelayMs||3000))
      }
    })
  }

  const runDiscovery=async()=>{
    discovered=await discoverImpl(config.discovery||{})
    return discovered
  }
  const getState=()=>controllerSnapshot({startedAt,agentState,lastAgentHeartbeat,discovered})
  const api=createLocalApi({config,getState,runDiscovery})
  api.listen(Number(config.listenPort),config.listenHost)
  launchAgent()

  const stop=()=>{
    clearTimeout(restartTimer)
    child?.kill?.('SIGTERM')
    api.close()
  }
  return {stop,getState,runDiscovery,api}
}

async function main(){
  const path=process.env.NEO_MINER_CONTROLLER_CONFIG||process.argv[2]||'server/miner-controller/config.example.json'
  const config=await loadControllerConfig(path)
  const controller=await runController(config)
  const shutdown=()=>controller.stop()
  process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown)
}

if(import.meta.url===`file://${process.argv[1]}`) main().catch(error=>{console.error(error);process.exitCode=1})
