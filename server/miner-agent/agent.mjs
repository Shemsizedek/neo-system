import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import process from 'node:process'
import {createReferenceAdapter} from './adapters/reference.mjs'

const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const now=()=>new Date().toISOString()

export function canonicalPayload(payload){
  return JSON.stringify(payload,Object.keys(payload).sort())
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

export async function postEnvelope(gatewayUrl,envelope,fetchImpl=fetch){
  if(!gatewayUrl.startsWith('https://')) throw new Error('Gateway URL must use HTTPS')
  const res=await fetchImpl(gatewayUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(envelope)})
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

export async function runAgent(config,{fetchImpl=fetch,adapter=createReferenceAdapter(config)}={}){
  const privateKeyPem=await fs.readFile(config.privateKeyPath,'utf8')
  let stopped=false
  const stop=()=>{stopped=true}
  const loop=async()=>{
    while(!stopped){
      try{
        const telemetry=await adapter.readTelemetry()
        const envelope=buildEnvelope({agentId:config.agentId,minerId:config.minerId,type:'TELEMETRY',payload:telemetry,privateKeyPem})
        await postEnvelope(config.gatewayUrl,envelope,fetchImpl)
      }catch(error){
        console.error(`[neo-miner-agent] ${now()} ${error instanceof Error?error.message:String(error)}`)
      }
      await sleep(Number(config.pollIntervalMs))
    }
  }
  return {stop,loop}
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
