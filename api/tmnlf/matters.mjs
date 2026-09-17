const seed=[
 {id:'TMNLF-001',name:'Institutional Governance Baseline',status:'RESEARCH',priority:'HIGH',jurisdiction:'Internal / jurisdiction mapping pending',objective:'Establish verified authority, governance boundaries and escalation rules for TMNLF operations.',evidence:4,authorities:7,nextAction:'Complete jurisdiction and authority verification matrix.'},
 {id:'TMNLF-002',name:'Digital Asset Compliance Framework',status:'FACT_DEVELOPMENT',priority:'HIGH',jurisdiction:'Multi-jurisdictional / unresolved',objective:'Separate technology, property, contract, securities and regulatory classifications before operational use.',evidence:3,authorities:5,nextAction:'Identify controlling regulator and offering facts before classification.'},
 {id:'TMNLF-003',name:'Evidence & Provenance Control',status:'EVIDENCE_COLLECTION',priority:'NORMAL',jurisdiction:'Internal operations',objective:'Standardize evidence intake, source references, verification status and chain-of-custody events.',evidence:9,authorities:2,nextAction:'Validate evidence-vault handoff and audit event format.'}
]

const memory=globalThis.__tmnlfMatterStore??{matters:[...seed],audit:[]}
globalThis.__tmnlfMatterStore=memory
const json=(res,status,body)=>res.status(status).setHeader('Cache-Control','no-store').json(body)

export default async function handler(req,res){
 if(req.method==='GET') return json(res,200,{ok:true,storage:'runtime-adapter',persistent:false,matters:memory.matters,auditCount:memory.audit.length})
 if(req.method==='POST'){
  const {name,objective}=req.body||{}
  if(!String(name||'').trim()||!String(objective||'').trim()) return json(res,400,{ok:false,error:'name_and_objective_required'})
  const max=memory.matters.reduce((n,m)=>Math.max(n,Number(String(m.id).split('-')[1])||0),0)
  const matter={id:`TMNLF-${String(max+1).padStart(3,'0')}`,name:String(name).trim(),status:'INTAKE',priority:'NORMAL',jurisdiction:'UNRESOLVED',objective:String(objective).trim(),evidence:0,authorities:0,nextAction:'Resolve jurisdiction before material legal conclusions.',createdAt:new Date().toISOString()}
  memory.matters.push(matter);memory.audit.push({at:new Date().toISOString(),action:'MATTER_CREATED',matterId:matter.id})
  return json(res,201,{ok:true,matter})
 }
 res.setHeader('Allow','GET, POST');return json(res,405,{ok:false,error:'method_not_allowed'})
}
