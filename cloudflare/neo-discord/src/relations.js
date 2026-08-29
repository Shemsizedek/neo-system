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
  if(!base) throw new Error('NEO Relations runtime is not configured')
  if(!token) throw new Error('NEO Relations runtime token is not configured')
  const r=await fetch(`${base}${path}`,{
    headers:{'accept':'application/json','authorization':`Bearer ${token}`,'user-agent':'neo-relations-discord'},
    signal:AbortSignal.timeout(12000)
  })
  const b=await r.json().catch(()=>({}))
  if(!r.ok) throw new Error(`Relations runtime ${r.status}: ${b?.error||b?.message||'request failed'}`)
  return b
}

function subOption(subcommand,name){
  return String((subcommand?.options||[]).find(x=>x.name===name)?.value||'').trim()
}

async function fetchTenant(env,tenant){
  const safe=tenant==='neopay'?'neopay':'neo-prime'
  const file=await gh(env,`/contents/apps/neo-relations/tenants/${safe}.json?ref=main`)
  const text=atob(String(file?.content||'').replace(/\n/g,''))
  return JSON.parse(text)
}

async function relationsStatus(env){
  const [repo,prime,pay]=await Promise.all([gh(env,''),fetchTenant(env,'neo-prime'),fetchTenant(env,'neopay')])
  return [
    '**NEO Relations Status**',
    `Repository: ${repo?.full_name||REPO}`,
    `Default branch: ${repo?.default_branch||'unknown'}`,
    `GitHub Pages: ${repo?.has_pages?'Enabled':'Not enabled'}`,
    `Tenants: ${prime?.displayName||prime?.id||'NEO Prime'}, ${pay?.displayName||pay?.id||'NEOpay'}`,
    `Persistence runtime: ${env.RELATIONS_API_BASE?'Configured':'Not configured'}`,
    'Discord access: Read-only',
    '',
    'Privileged writes, approvals, payment actions, and identity changes remain disabled from Discord.'
  ].join('\n')
}

async function tenantSummary(env,tenant){
  const cfg=await fetchTenant(env,tenant)
  const modules=cfg?.modules&&typeof cfg.modules==='object'
    ? Object.entries(cfg.modules).filter(([,enabled])=>enabled===true).map(([name])=>name).join(', ')
    : 'not declared'
  const pipelines=cfg?.pipelines&&typeof cfg.pipelines==='object'
    ? Object.entries(cfg.pipelines).map(([name,stages])=>`${name}: ${Array.isArray(stages)?stages.join(' → '):'configured'}`).join('; ')
    : 'not declared'
  return [
    `**NEO Relations Tenant: ${cfg?.displayName||cfg?.id||tenant}**`,
    `ID: ${cfg?.id||tenant}`,
    `Service: ${cfg?.serviceKey||'not declared'}`,
    `Modules: ${modules||'none'}`,
    `Pipelines: ${pipelines||'none'}`,
    'Source: GitHub main branch tenant configuration.'
  ].join('\n')
}

async function serviceSummary(env){
  const file=await gh(env,'/contents/apps/neo-relations/site/status.json?ref=main')
  const text=atob(String(file?.content||'').replace(/\n/g,''))
  const s=JSON.parse(text)
  const rows=Object.entries(s?.services||{}).map(([k,v])=>`${k}: ${typeof v==='string'?v:(v?.status||'configured')}`)
  return ['**NEO Relations Services**',...(rows.length?rows:['No service status entries found.']),'','Source: GitHub-backed status.json'].join('\n')
}

async function approvalsSummary(env,tenant){
  const safe=tenant==='neopay'?'neopay':'neo-prime'
  const data=await relationsApi(env,`/api/relations/intents?tenantId=${encodeURIComponent(safe)}&status=pending_approval`)
  const items=Array.isArray(data)?data:(Array.isArray(data?.items)?data.items:[])
  const rows=items.slice(0,10).map(x=>{
    const id=x.intent_id||x.intentId||'unknown'
    const action=x.action||'unspecified'
    const resource=x.resource_type||x.resource?.type||'resource'
    const created=x.created_at||x.createdAt||''
    return `• ${id} — ${action} ${resource}${created?` — ${created}`:''}`
  })
  return [
    `**NEO Relations Pending Approvals — ${safe}**`,
    ...(rows.length?rows:['No pending approval intents.']),
    '',
    'Read-only Discord view. Approval and execution are intentionally disabled here.'
  ].join('\n')
}

export async function handleRelationsCommand(interaction,env){
  const subcommand=interaction?.data?.options?.[0]||{}
  const sub=String(subcommand?.name||'status')
  if(sub==='status')return relationsStatus(env)
  if(sub==='tenant')return tenantSummary(env,subOption(subcommand,'name')||'neo-prime')
  if(sub==='services')return serviceSummary(env)
  if(sub==='approvals')return approvalsSummary(env,subOption(subcommand,'tenant')||'neo-prime')
  return 'Supported `/relations` subcommands: `status`, `tenant`, `services`, `approvals`.'
}
