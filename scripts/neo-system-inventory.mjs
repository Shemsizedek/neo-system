import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

const ROOT=process.cwd()
export const INVENTORY_PATH='architecture/neo-existing-system-inventory.json'

const exists=(root,p)=>fs.existsSync(path.join(root,p))

export function loadInventory(root=ROOT){
  return JSON.parse(fs.readFileSync(path.join(root,INVENTORY_PATH),'utf8'))
}

function listChildren(root,dir){
  const full=path.join(root,dir)
  if(!fs.existsSync(full)) return []
  return fs.readdirSync(full,{withFileTypes:true})
    .filter(x=>x.isDirectory())
    .map(x=>`${dir}/${x.name}`)
    .sort()
}

export function classifySystem(system,root=ROOT){
  const evidence=(system.evidence||[]).map(p=>({path:p,exists:exists(root,p)}))
  const tests=(system.tests||[]).map(p=>({path:p,exists:exists(root,p)}))
  const workflows=(system.deployment_workflows||[]).map(p=>({path:p,exists:exists(root,p)}))
  const present=evidence.filter(x=>x.exists).length
  let classification='UNKNOWN'
  if(evidence.length){
    if(present===0) classification='MISSING'
    else if(present===evidence.length) classification='EXISTING'
    else classification='PARTIAL'
  }
  const runtime_state=workflows.some(x=>x.exists)
    ? 'DEPLOYMENT_CONFIGURED_NOT_RUNTIME_VERIFIED'
    : 'UNKNOWN'
  const test_state=tests.length===0
    ? 'UNKNOWN'
    : tests.every(x=>x.exists)?'TEST_SURFACE_PRESENT':'PARTIAL'
  return {...system,classification,runtime_state,test_state,evidence,tests,deployment_workflows:workflows}
}

export function buildInventoryReport(config,{root=ROOT}={}){
  const systems=(config.systems||[]).map(s=>classifySystem(s,root))
  const mapped=new Set(systems.flatMap(s=>(s.evidence||[]).map(e=>e.path)))
  const discovered=[
    ...listChildren(root,'apps'),
    ...listChildren(root,'server'),
    ...listChildren(root,'services'),
    ...listChildren(root,'agents')
  ]
  const unmapped=discovered.filter(p=>![...mapped].some(m=>m===p||m.startsWith(p+'/')||p.startsWith(m+'/')))
  const counts={EXISTING:0,PARTIAL:0,MISSING:0,UNKNOWN:0}
  for(const s of systems) counts[s.classification]++
  const errors=[]
  const ids=new Set()
  for(const s of systems){
    if(ids.has(s.system_id)) errors.push(`duplicate_system_id:${s.system_id}`)
    ids.add(s.system_id)
  }
  return {
    gate:102,
    generated_at:new Date().toISOString(),
    summary:{systems:systems.length,counts,unmapped_components:unmapped.length,errors:errors.length},
    systems,
    unmapped_components:unmapped,
    errors,
    truth_notes:[
      'EXISTING means configured source evidence is present in the repository.',
      'EXISTING does not prove a live healthy production runtime.',
      'Deployment workflow presence means deployment is configured, not successfully deployed.',
      'UNKNOWN is preferred when live runtime evidence is unavailable.'
    ]
  }
}

export function writeInventoryReport(report,output='artifacts/implementation/gate-102-inventory.json',root=ROOT){
  const target=path.join(root,output)
  fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n')
  return target
}

function main(){
  const args=new Set(process.argv.slice(2))
  const report=buildInventoryReport(loadInventory())
  if(args.has('--write')) writeInventoryReport(report)
  process.stdout.write(JSON.stringify(report,null,2)+'\n')
  if(args.has('--check')&&report.errors.length) process.exitCode=1
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) main()
