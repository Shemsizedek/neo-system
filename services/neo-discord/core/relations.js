const REPO='Shemsizedek/neo-system'
const API='https://api.github.com/repos/'

async function gh(env,path){
  const headers={'accept':'application/vnd.github+json','user-agent':'neo-relations-discord','x-github-api-version':'2022-11-28'}
  if(env.GITHUB_API_TOKEN)headers.authorization=`Bearer ${env.GITHUB_API_TOKEN}`
  const r=await fetch(`${API}${REPO}${path}`,{headers,signal:AbortSignal.timeout(12000)})
  const b=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(`GitHub ${r.status}: ${b?.message||'request failed'}`)
  return b
}

async function relationsApi(env,path){
  const base=String(env.RELATIONS_API_BASE||'').replace(/\/$/,'')
  const token=String(env.RELATIONS_API_TOKEN||'').trim()
  if(!base) throw new Error('NEO Relations persistence transport is not configured')
  if(!token) throw new Error('NEO Relations read-only token is not configured')
  const r=await fetch(`${base}${path}`,{headers:{accept:'application/json',authorization:`Bearer ${token}`,'user-agent':'neo-relations-discord'},signal:AbortSignal.timeout(12000)})
  const b=await r.json().catch(()=>({}))
  if(!r.ok) throw new Error(`Relations transport ${r.status}: ${b?.error||b?.message||'request failed'}`)
  return b
}

function decodeContent(file){return atob(String(file?.content||'').replace(/\n/g,''))}
function subOption(subcommand,name){return String((subcommand?.options||[]).find(x=>x.name===name)?.value||'').trim()}
async function fetchJson(env,path){const file=await gh(env,`/contents/${path}?ref=main`);return JSON.parse(decodeContent(file))}
async function fetchTenant(env,tenant){const safe=tenant==='neopay'?'neopay':'neo-prime';return fetchJson(env,`apps/neo-relations/tenants/${safe}.json`)}

async function relationsStatus(env){
  const [repo,prime,pay,control]=await Promise.all([gh(env,''),fetchTenant(env,'neo-prime'),fetchTenant(env,'neopay'),fetchJson(env,'apps/neo-relations/contracts/control-plane.json')])
  return ['**NEO Relations Status**',`Repository: ${repo?.full_name||REPO}`,`Default branch: ${repo?.default_branch||'unknown'}`,`Frontend: ${control?.frontend?.primary||'github-pages'}`,`Backend: ${control?.backend?.sourceOfTruth||'github'} + ${control?.backend?.orchestration||'github-actions'}`,`API plane: ${control?.apiPlane?.primary||'discord'}`,`Tenants: ${prime?.displayName||prime?.id||'NEO Prime'}, ${pay?.displayName||pay?.id||'NEOpay'}`,`Execution worker: ${control?.security?.executionWorker===false?'Disabled':'Unknown'}`,'','Discord is the primary operator/API surface. Sensitive approvals and direct execution remain disabled.'].join('\n')
}

async function architectureSummary(env){
  const c=await fetchJson(env,'apps/neo-relations/contracts/control-plane.json')
  return ['**NEO Relations Architecture**',`Frontend → ${c?.frontend?.primary||'github-pages'}`,`Backend source → ${c?.backend?.sourceOfTruth||'github'}`,`Backend orchestration → ${c?.backend?.orchestration||'github-actions'}`,`Server / API plane → ${c?.apiPlane?.primary||'discord'}`,`Discord transport → ${c?.transport?.role||'thin-https-adapter-only'}`,`Transactional writes → ${c?.backend?.transactionalWrites||'disabled'}`,`Architecture version → ${c?.architectureVersion||'unknown'}`,'','GitHub remains authoritative. Discord remains the primary command, event, and API surface.'].join('\n')
}

async function tenantSummary(env,tenant){
  const cfg=await fetchTenant(env,tenant)
  const modules=cfg?.modules&&typeof cfg.modules==='object'?Object.entries(cfg.modules).filter(([,enabled])=>enabled===true).map(([name])=>name).join(', '):'not declared'
  const pipelines=cfg?.pipelines&&typeof cfg.pipelines==='object'?Object.entries(cfg.pipelines).map(([name,stages])=>`${name}: ${Array.isArray(stages)?stages.join(' → '):'configured'}`).join('; '):'not declared'
  return [`**NEO Relations Tenant: ${cfg?.displayName||cfg?.id||tenant}**`,`ID: ${cfg?.id||tenant}`,`Service: ${cfg?.serviceKey||'not declared'}`,`Modules: ${modules||'none'}`,`Pipelines: ${pipelines||'none'}`,'Source: GitHub main branch tenant configuration.'].join('\n')
}

async function serviceSummary(env){
  const s=await fetchJson(env,'apps/neo-relations/site/data/status.json')
  return ['**NEO Relations Services**',`Service: ${s?.service||'neo-relations'}`,`Overall: ${s?.overall||'unknown'}`,`Frontend: ${s?.frontend||'unknown'}`,`Backbone: ${s?.backbone||'unknown'}`,`Discord: ${s?.discord||'unknown'}`,`Secrets: ${s?.secrets||'unknown'}`,`Architecture: ${s?.architecture_version||'unknown'}`,'','Source: GitHub-backed status.json'].join('\n')
}

async function approvalsSummary(env,tenant){
  const safe=tenant==='neopay'?'neopay':'neo-prime'
  const data=await relationsApi(env,`/intents?tenantId=${encodeURIComponent(safe)}&status=pending_approval`)
  const items=Array.isArray(data)?data:(Array.isArray(data?.items)?data.items:[])
  const rows=items.slice(0,10).map(x=>{const id=x.intent_id||x.intentId||'unknown';const action=x.action||'unspecified';const resource=x.resource_type||x.resource?.type||'resource';const created=x.created_at||x.createdAt||'';return `• ${id} — ${action} ${resource}${created?` — ${created}`:''}`})
  return [`**NEO Relations Pending Approvals — ${safe}**`,...(rows.length?rows:['No pending approval intents.']),'','Read-only Discord view. Approval and execution are intentionally disabled here.'].join('\n')
}

export async function handleRelationsCommand(interaction,env){
  const subcommand=interaction?.data?.options?.[0]||{}
  const sub=String(subcommand?.name||'status')
  if(sub==='status')return relationsStatus(env)
  if(sub==='architecture')return architectureSummary(env)
  if(sub==='tenant')return tenantSummary(env,subOption(subcommand,'name')||'neo-prime')
  if(sub==='services')return serviceSummary(env)
  if(sub==='approvals')return approvalsSummary(env,subOption(subcommand,'tenant')||'neo-prime')
  return 'Supported `/relations` subcommands: `status`, `architecture`, `tenant`, `services`, `approvals`.'
}
