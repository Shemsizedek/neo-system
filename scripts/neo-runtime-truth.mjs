import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

export const TARGETS_PATH='architecture/neo-runtime-targets.json'
const ROOT=process.cwd()

export function loadTargets(root=ROOT){
  return JSON.parse(fs.readFileSync(path.join(root,TARGETS_PATH),'utf8'))
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms))

export async function probeTarget(target,{fetchImpl=fetch,retries=3,retryDelayMs=3000}={}){
  const attempts=[]
  for(let i=1;i<=retries;i++){
    const started=Date.now()
    try{
      const response=await fetchImpl(target.url,{headers:{accept:'application/json','user-agent':'NEO-G103-Runtime-Truth/1.0'},redirect:'follow',signal:AbortSignal.timeout(15000)})
      const text=await response.text()
      let json=null
      try{json=JSON.parse(text)}catch{}
      const httpOk=(target.expected_http||[200]).includes(response.status)
      const payloadOk=target.expect_json_ok ? json?.ok===true : true
      const ok=httpOk&&payloadOk
      attempts.push({attempt:i,http_status:response.status,latency_ms:Date.now()-started,json_ok:json?.ok??null,ok})
      if(ok) return {
        system_id:target.system_id,
        url:target.url,
        critical:Boolean(target.critical),
        runtime_state:'LIVE_HEALTHY',
        checked_at:new Date().toISOString(),
        attempts,
        evidence:{http_status:response.status,json}
      }
    }catch(error){
      attempts.push({attempt:i,error:String(error?.message||error),latency_ms:Date.now()-started,ok:false})
    }
    if(i<retries) await sleep(retryDelayMs)
  }
  return {
    system_id:target.system_id,
    url:target.url,
    critical:Boolean(target.critical),
    runtime_state:'LIVE_UNHEALTHY',
    checked_at:new Date().toISOString(),
    attempts,
    evidence:null
  }
}

export async function buildRuntimeReport(config,{fetchImpl=fetch}={}){
  const retries=config.autopilot?.retry_count||3
  const retryDelayMs=config.autopilot?.retry_delay_ms||3000
  const results=[]
  for(const target of config.targets||[]) results.push(await probeTarget(target,{fetchImpl,retries,retryDelayMs}))
  const counts={LIVE_HEALTHY:0,LIVE_UNHEALTHY:0,RUNTIME_UNKNOWN:0}
  for(const r of results) counts[r.runtime_state]=(counts[r.runtime_state]||0)+1
  const critical_failures=results.filter(r=>r.critical&&r.runtime_state!=='LIVE_HEALTHY').map(r=>r.system_id)
  return {
    gate:103,
    generated_at:new Date().toISOString(),
    summary:{targets:results.length,counts,critical_failures},
    systems:results,
    production_validated:false,
    production_validation_reason:'Health probes prove runtime reachability/declared health only; functional validation remains a separate gate.'
  }
}

export function writeRuntimeReport(report,output='artifacts/implementation/gate-103-runtime-truth.json',root=ROOT){
  const target=path.join(root,output)
  fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n')
  return target
}

async function main(){
  const args=new Set(process.argv.slice(2))
  const config=loadTargets()
  const report=await buildRuntimeReport(config)
  if(args.has('--write')) writeRuntimeReport(report)
  process.stdout.write(JSON.stringify(report,null,2)+'\n')
  if(args.has('--check-critical')&&report.summary.critical_failures.length) process.exitCode=1
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) await main()
