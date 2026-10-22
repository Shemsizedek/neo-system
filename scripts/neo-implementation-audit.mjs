import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

const ROOT=process.cwd()
export const REGISTRY_PATH='architecture/neo-implementation-program.json'
const VALID_STATUSES=new Set(['NOT_ASSESSED','NOT_BUILT','PLANNED','IN_PROGRESS','PARTIAL','IMPLEMENTED','DEPLOYED','VALIDATED','DEPRECATED','BLOCKED','NOT_APPLICABLE'])
const CLAIMED_IMPLEMENTATION=new Set(['IMPLEMENTED','DEPLOYED','VALIDATED'])

const relExists=(p,root=ROOT)=>fs.existsSync(path.join(root,p))

export function loadRegistry(root=ROOT){
  return JSON.parse(fs.readFileSync(path.join(root,REGISTRY_PATH),'utf8'))
}

export function discoverInventory(root=ROOT){
  const groups=['apps','server','services','agents','orchestration','architecture','registry']
  const inventory={}
  for(const group of groups){
    const dir=path.join(root,group)
    if(!fs.existsSync(dir)){ inventory[group]=[]; continue }
    inventory[group]=fs.readdirSync(dir,{withFileTypes:true})
      .filter(entry=>entry.isDirectory()||entry.isFile())
      .map(entry=>entry.name)
      .sort()
  }
  return inventory
}

export function auditRegistry(registry,{root=ROOT}={}){
  const errors=[]
  const warnings=[]
  const traces=[]
  const seen=new Set()

  if(registry.schema_version!==1) errors.push('unsupported_schema_version')
  if(registry.source_gate!==101) errors.push('source_gate_must_be_101')
  if(!Array.isArray(registry.requirements)) errors.push('requirements_must_be_array')

  for(const req of registry.requirements||[]){
    if(!req.requirement_id) { errors.push('requirement_missing_id'); continue }
    if(seen.has(req.requirement_id)) errors.push(`duplicate_requirement:${req.requirement_id}`)
    seen.add(req.requirement_id)
    if(!VALID_STATUSES.has(req.status)) errors.push(`invalid_status:${req.requirement_id}:${req.status}`)

    const evidence=Array.isArray(req.evidence)?req.evidence:[]
    const tests=Array.isArray(req.tests)?req.tests:[]
    const missingEvidence=evidence.filter(p=>!relExists(p,root))
    const missingTests=tests.filter(p=>!relExists(p,root))

    if(CLAIMED_IMPLEMENTATION.has(req.status) && evidence.length===0)
      errors.push(`claimed_without_evidence:${req.requirement_id}`)
    if(CLAIMED_IMPLEMENTATION.has(req.status) && missingEvidence.length)
      errors.push(`missing_evidence:${req.requirement_id}:${missingEvidence.join(',')}`)
    if(req.status==='VALIDATED' && tests.length===0)
      errors.push(`validated_without_test:${req.requirement_id}`)
    if(req.status==='VALIDATED' && missingTests.length)
      errors.push(`missing_test:${req.requirement_id}:${missingTests.join(',')}`)

    if(['NOT_BUILT','BLOCKED','PARTIAL','NOT_ASSESSED'].includes(req.status))
      warnings.push(`implementation_gap:${req.requirement_id}:${req.status}`)

    traces.push({
      requirement_id:req.requirement_id,
      section:req.section,
      title:req.title,
      priority:req.priority,
      status:req.status,
      evidence:evidence.map(p=>({path:p,exists:relExists(p,root)})),
      tests:tests.map(p=>({path:p,exists:relExists(p,root)})),
      health:missingEvidence.length||missingTests.length?'BROKEN':CLAIMED_IMPLEMENTATION.has(req.status)?'PASSING':'UNKNOWN'
    })
  }

  for(const capability of registry.capabilities||[]){
    const missing=(capability.evidence||[]).filter(p=>!relExists(p,root))
    if(['IMPLEMENTED','DEPLOYED','VALIDATED'].includes(capability.status)&&missing.length)
      errors.push(`capability_missing_evidence:${capability.capability_id}:${missing.join(',')}`)
    if(missing.length)
      warnings.push(`capability_evidence_gap:${capability.capability_id}:${missing.join(',')}`)
  }

  const counts={}
  for(const status of VALID_STATUSES) counts[status]=0
  for(const req of registry.requirements||[]) if(counts[req.status]!==undefined) counts[req.status]++

  const backlog=traces
    .filter(x=>['NOT_ASSESSED','NOT_BUILT','PLANNED','IN_PROGRESS','PARTIAL','BLOCKED'].includes(x.status))
    .sort((a,b)=>String(a.priority).localeCompare(String(b.priority))||a.requirement_id.localeCompare(b.requirement_id))

  return {
    program_id:registry.program_id,
    architecture_baseline:registry.architecture_baseline,
    generated_at:new Date().toISOString(),
    summary:{total:traces.length,counts,errors:errors.length,warnings:warnings.length},
    traces,
    backlog,
    inventory:discoverInventory(root),
    errors,
    warnings
  }
}

export function writeReport(report,output='artifacts/implementation/gate-101-report.json',root=ROOT){
  const target=path.join(root,output)
  fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n')
  return target
}

function main(){
  const args=new Set(process.argv.slice(2))
  const registry=loadRegistry()
  const report=auditRegistry(registry)
  if(args.has('--write')) writeReport(report)
  process.stdout.write(JSON.stringify(report,null,2)+'\n')
  if(args.has('--check')&&report.errors.length) process.exitCode=1
  if(args.has('--strict')&&report.backlog.some(x=>['P0','P1'].includes(x.priority))) process.exitCode=2
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) main()
