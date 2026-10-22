import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
const ROOT=process.cwd()
export const POLICY_PATH='architecture/neo-sovereign-hosting-policy.json'
export const WORKLOADS_PATH='architecture/neo-workloads.json'
const readJson=(p,root=ROOT)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))
export const loadHostingPolicy=(root=ROOT)=>readJson(POLICY_PATH,root)
export const loadWorkloads=(root=ROOT)=>readJson(WORKLOADS_PATH,root)

export function validateWorkload(workload,{root=ROOT}={}){
  const issues=[]
  if(!workload.workload_id)issues.push('missing_workload_id')
  if(!workload.containerfile)issues.push('missing_containerfile')
  else if(!fs.existsSync(path.join(root,workload.containerfile)))issues.push('containerfile_missing')
  if(!Number.isInteger(workload.port)||workload.port<1)issues.push('invalid_port')
  if(!String(workload.health_path||'').startsWith('/'))issues.push('invalid_health_path')
  if(workload.secret_mode!=='runtime-only')issues.push('secret_mode_must_be_runtime_only')
  return {workload_id:workload.workload_id,valid:issues.length===0,issues}
}
export function providerCandidates(workload,policy,{capitalApproved=false,selfHostReady=false}={}){
  const providers=[],cfg=policy.providers||{},current=cfg[workload.current_provider]
  if(current?.enabled)providers.push({provider:workload.current_provider,mode:'CURRENT',eligible:true})
  if(workload.portable&&cfg.oci?.enabled)providers.push({provider:'oci',mode:'SHADOW_OR_FALLBACK',eligible:true})
  const neo=cfg['neo-owned']
  providers.push({provider:'neo-owned',mode:'SOVEREIGN_TARGET',eligible:Boolean(workload.self_host_candidate&&capitalApproved&&selfHostReady&&neo&&(neo.enabled===true||policy.placement.allow_shadow_self_host===true)),reason:!workload.self_host_candidate?'workload_not_approved_candidate':!capitalApproved?'capital_gate_not_approved':!selfHostReady?'self_host_readiness_not_proven':null})
  return providers
}
export function choosePlacement({workload,policy,capitalApproved=false,selfHostReady=false}={}){
  const candidates=providerCandidates(workload,policy,{capitalApproved,selfHostReady})
  const current=candidates.find(x=>x.mode==='CURRENT'&&x.eligible), sovereign=candidates.find(x=>x.provider==='neo-owned'&&x.eligible)
  if(policy.placement.prefer_current_production&&current)return {workload_id:workload.workload_id,selected:current.provider,mode:'KEEP_CURRENT',migration:false,candidates}
  if(sovereign)return {workload_id:workload.workload_id,selected:'neo-owned',mode:'SHADOW_READY',migration:false,candidates}
  const fallback=candidates.find(x=>x.eligible)
  return {workload_id:workload.workload_id,selected:fallback?.provider||null,mode:fallback?'FALLBACK_AVAILABLE':'BLOCKED',migration:false,candidates}
}
export function buildPortabilityReport({policy=loadHostingPolicy(),registry=loadWorkloads(),root=ROOT}={}){
  const workloads=(registry.workloads||[]).map(w=>({...w,validation:validateWorkload(w,{root}),placement:choosePlacement({workload:w,policy})}))
  return {gate:111,generated_at:new Date().toISOString(),summary:{workloads:workloads.length,valid:workloads.filter(x=>x.validation.valid).length,portable:workloads.filter(x=>x.portable).length,self_host_candidates:workloads.filter(x=>x.self_host_candidate).length,migrations_authorized:0},workloads,policy_boundary:'Provider portability and shadow readiness do not authorize production migration, DNS cutover, database-primary switch, or secret migration.'}
}
export function buildSelfHostManifest(workload,{image}={}){
  if(!workload?.self_host_candidate)throw new Error('workload_not_self_host_candidate')
  return {version:'3.9',services:{[workload.workload_id]:{image:image||`neo-local/${workload.workload_id}:candidate`,restart:'unless-stopped',ports:[`${workload.port}:${workload.port}`],environment:['NODE_ENV=production',`PORT=${workload.port}`],healthcheck:{test:['CMD-SHELL',`node -e "fetch('http://127.0.0.1:${workload.port}${workload.health_path}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`],interval:'30s',timeout:'10s',retries:3}}}}
}
export function writeReport(report,output='artifacts/implementation/gate-111-hosting-portability.json',root=ROOT){const target=path.join(root,output);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');return target}
function main(){const args=new Set(process.argv.slice(2)),report=buildPortabilityReport();if(args.has('--write'))writeReport(report);process.stdout.write(JSON.stringify(report,null,2)+'\n');if(args.has('--check')&&report.summary.valid!==report.summary.workloads)process.exitCode=1}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main()
