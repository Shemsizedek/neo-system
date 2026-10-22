import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

const ROOT=process.cwd()
export const POLICY_PATH='architecture/neo-site-operations-policy.json'
export const HOSTS_PATH='architecture/neo-hosts.json'

const readJson=(p,root=ROOT)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))
export const loadSiteOpsPolicy=(root=ROOT)=>readJson(POLICY_PATH,root)
export const loadHostRegistry=(root=ROOT)=>readJson(HOSTS_PATH,root)

const score=(checks=[])=>{
  if(!checks.length)return 0
  const passed=checks.filter(c=>c.ok===true).length
  return Math.round((passed/checks.length)*100)
}

export function classifyFinding(check){
  if(check.ok===true)return 'PASS'
  if(check.verified===false)return 'UNVERIFIED'
  if(check.severity==='critical')return 'CRITICAL'
  if(check.severity==='high')return 'HIGH'
  if(check.severity==='medium')return 'MEDIUM'
  return 'LOW'
}

export async function inspectSite({url,fetchImpl=fetch}={}){
  if(!url)throw new TypeError('url required')
  const checks=[]
  let response,text=''
  try{
    response=await fetchImpl(url,{redirect:'follow',headers:{'user-agent':'NEO-G110-SiteOps/1.0','accept':'text/html,application/xhtml+xml'}})
    text=await response.text()
    checks.push({id:'HTTP_STATUS',ok:response.ok,status:response.status,severity:response.status>=500?'critical':response.status>=400?'high':'low',verified:true})
    checks.push({id:'TLS',ok:new URL(response.url||url).protocol==='https:',severity:'high',verified:true})
    checks.push({id:'TITLE',ok:/<title[^>]*>[^<]{3,}<\/title>/i.test(text),severity:'medium',verified:true})
    checks.push({id:'META_DESCRIPTION',ok:/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}["']/i.test(text)||/<meta[^>]+content=["'][^"']{20,}["'][^>]+name=["']description["']/i.test(text),severity:'medium',verified:true})
    checks.push({id:'CANONICAL',ok:/<link[^>]+rel=["']canonical["'][^>]+href=/i.test(text)||/<link[^>]+href=[^>]+rel=["']canonical["']/i.test(text),severity:'medium',verified:true})
    checks.push({id:'STRUCTURED_DATA',ok:/application\/ld\+json/i.test(text),severity:'low',verified:true})
    const stripped=text.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
    checks.push({id:'VISIBLE_TEXT',ok:stripped.length>300,severity:'high',verified:true,characters:stripped.length})
  }catch(error){
    checks.push({id:'HTTP_STATUS',ok:false,severity:'critical',verified:true,error:String(error?.message||error)})
    return {url,score:0,state:'CRITICAL',checks,findings:checks.map(c=>({...c,state:classifyFinding(c)}))}
  }

  for(const [id,pathName] of [['ROBOTS','/robots.txt'],['SITEMAP','/sitemap.xml'],['ADS_TXT','/ads.txt']]){
    try{
      const target=new URL(pathName,url)
      const r=await fetchImpl(target,{redirect:'follow',headers:{'user-agent':'NEO-G110-SiteOps/1.0'}})
      checks.push({id,ok:r.ok,status:r.status,severity:id==='ADS_TXT'?'medium':'high',verified:true})
    }catch(error){
      checks.push({id,ok:false,severity:id==='ADS_TXT'?'medium':'high',verified:true,error:String(error?.message||error)})
    }
  }

  checks.push({id:'CRAWLER_ACCESS',ok:null,verified:false,severity:'medium',note:'Requires verified provider crawler evidence or search-console/log evidence; user-agent simulation alone is insufficient.'})
  checks.push({id:'BROKEN_LINKS',ok:null,verified:false,severity:'medium',note:'Deep crawl not performed in lightweight inspection.'})
  checks.push({id:'MOBILE_UX',ok:/<meta[^>]+name=["']viewport["']/i.test(text),verified:true,severity:'medium'})

  const findings=checks.map(c=>({...c,state:classifyFinding(c)}))
  const hard=checks.filter(c=>c.verified!==false)
  const pct=score(hard)
  const state=findings.some(f=>f.state==='CRITICAL')?'CRITICAL':findings.some(f=>f.state==='HIGH')?'DEGRADED':findings.some(f=>f.state==='MEDIUM')?'WATCH':'HEALTHY'
  return {url,score:pct,state,checks,findings}
}

export function buildEstateTargets(hostRegistry){
  const targets=[{host:hostRegistry.domainRoot,url:`https://${hostRegistry.domainRoot}`,role:'canonical-root'}]
  for(const h of hostRegistry.hosts||[]){
    targets.push({host:h.host,url:`https://${h.host}`,role:h.role,service:h.service,runtime:h.runtime||hostRegistry.runtime})
  }
  return targets
}

export function generateRepairWork(siteReport){
  return siteReport.findings
    .filter(f=>['CRITICAL','HIGH','MEDIUM'].includes(f.state))
    .map(f=>({
      work_id:`SITE-${new URL(siteReport.url).hostname}-${f.id}`,
      site:siteReport.url,
      check:f.id,
      severity:f.state,
      objective:`Repair or resolve ${f.id} for ${siteReport.url} and verify the result with source-backed evidence.`,
      auto_publish:false,
      requires_authority:f.id==='CANONICAL'||f.id==='ADS_TXT'
    }))
}

export function buildSelfHostingReadiness({policy=loadSiteOpsPolicy(),capabilities={}}={}){
  const reqs=policy.self_hosting.requirements||[]
  const items=reqs.map(id=>({id,ready:capabilities[id]===true}))
  const ready=items.filter(x=>x.ready).length
  return {
    target_state:policy.self_hosting.target_state,
    capital_gate_required:policy.self_hosting.capital_gate_required,
    readiness_percent:reqs.length?Math.round(ready/reqs.length*100):0,
    requirements:items,
    migration_authorized:false,
    note:'Readiness scoring does not authorize provider migration or DNS cutover.'
  }
}

export async function buildSiteOpsReport({fetchImpl=fetch,limit=8}={}){
  const hosts=loadHostRegistry()
  const policy=loadSiteOpsPolicy()
  const targets=buildEstateTargets(hosts).slice(0,Math.max(1,limit))
  const sites=[]
  for(const target of targets){
    const report=await inspectSite({url:target.url,fetchImpl})
    sites.push({...target,...report,repair_work:generateRepairWork(report)})
  }
  return {
    gate:110,
    generated_at:new Date().toISOString(),
    estate:{canonical_root:policy.estate.canonical_root,system_gateway:policy.estate.system_gateway},
    summary:{
      inspected:sites.length,
      healthy:sites.filter(s=>s.state==='HEALTHY').length,
      watch:sites.filter(s=>s.state==='WATCH').length,
      degraded:sites.filter(s=>s.state==='DEGRADED').length,
      critical:sites.filter(s=>s.state==='CRITICAL').length,
      repair_work:sites.reduce((n,s)=>n+s.repair_work.length,0)
    },
    sites,
    self_hosting:buildSelfHostingReadiness({policy})
  }
}

export function writeSiteOpsReport(report,output='artifacts/implementation/gate-110-site-operations.json',root=ROOT){
  const target=path.join(root,output)
  fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n')
  return target
}

async function main(){
  const args=new Set(process.argv.slice(2))
  const limitArg=process.argv.find(x=>x.startsWith('--limit='))
  const limit=limitArg?Number(limitArg.split('=')[1]):8
  const report=await buildSiteOpsReport({limit})
  if(args.has('--write'))writeSiteOpsReport(report)
  process.stdout.write(JSON.stringify(report,null,2)+'\n')
  if(args.has('--check-critical')&&report.summary.critical>0)process.exitCode=1
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main()
