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

export function createLocalApi({config,getState,runDiscovery}){
  return http.createServer(async(req,res)=>{
    const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data))}
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
