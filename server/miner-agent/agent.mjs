import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import process from 'node:process'
import {createAdapter} from './adapters/index.mjs'

const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const now=()=>new Date().toISOString()

export function canonicalPayload(payload){
  // Recursively canonicalize every nested field. A top-level JSON replacer list
  // silently omits unlisted nested fields and cannot authenticate telemetry.
  const normalize=value=>{
    if(Array.isArray(value))return value.map(normalize)
    if(value&&typeof value==='object'){
      return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize(value[key])]))
    }
    return value
  }
  return JSON.stringify(normalize(payload))
}

export function signEvent(payload,privateKeyPem){
  return crypto.sign(null,Buffer.from(canonicalPayload(payload)),privateKeyPem).toString('base64')
}

export function verifyEvent(payload,signature,publicKeyPem){
  return crypto.verify(null,Buffer.from(canonicalPayload(payload)),publicKeyPem,Buffer.from(signature,'base64'))
}

export function buildEnvelope({agentId,minerId,type,payload,privateKeyPem}){
  const body={agentId,minerId,type,occurredAt:now(),nonce:crypto.randomUUID(),payload}
  return {...body,signature:signEvent(body,privateKeyPem)}
}

export async function postEnvelope(gatewayUrl,envelope,fetchImpl=fetch,{token=''}={}){
  if(!gatewayUrl.startsWith('https://')) throw new Error('Gateway URL must use HTTPS')
  const res=await fetchImpl(gatewayUrl,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(envelope)})
  if(!res.ok) throw new Error(`Gateway rejected event: ${res.status}`)
  return res.json().catch(()=>({ok:true}))
}

export async function loadConfig(path){
  const raw=await fs.readFile(path,'utf8')
  const cfg=JSON.parse(raw)
  for(const key of ['agentId','minerId','gatewayUrl','privateKeyPath','pollIntervalMs']) if(!cfg[key]) throw new Error(`Missing config field: ${key}`)
  if(!cfg.gatewayUrl.startsWith('https://')) throw new Error('gatewayUrl must use HTTPS')
  return cfg
}

export async function runAgent(config,{fetchImpl=fetch,adapter=createAdapter(config)}={}){
  const privateKeyPem=await fs.readFile(config.privateKeyPath,'utf8')
  let stopped=false
  const stop=()=>{stopped=true}
  const loop=async()=>{
    while(!stopped){
      try{
        const telemetry=await adapter.readTelemetry()
        const envelope=buildEnvelope({agentId:config.agentId,minerId:config.minerId,type:'TELEMETRY',payload:telemetry,privateKeyPem})
        await postEnvelope(config.gatewayUrl,envelope,fetchImpl,{token:process.env.NEO_MINER_AGENT_GATEWAY_TOKEN||''})
      }catch(error){
        console.error(`[neo-miner-agent] ${now()} ${error instanceof Error?error.message:String(error)}`)
      }
      await sleep(Number(config.pollIntervalMs))
    }
  }
  return {stop,loop,adapter}
}

async function main(){
  const configPath=process.env.NEO_MINER_AGENT_CONFIG||process.argv[2]||'server/miner-agent/config.example.json'
  const config=await loadConfig(configPath)
  const agent=await runAgent(config)
  const shutdown=()=>agent.stop()
  process.on('SIGINT',shutdown)
  process.on('SIGTERM',shutdown)
  await agent.loop()
}

if(import.meta.url===`file://${process.argv[1]}`) main().catch(err=>{console.error(err);process.exitCode=1})
