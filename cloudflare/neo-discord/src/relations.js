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

function opt(interaction,name){
  return String((interaction?.data?.options||[]).find(x=>x.name===name)?.value||'').trim()
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
    `Tenants: ${prime?.name||'NEO Prime'}, ${pay?.name||'NEOpay'}`,
    'Mode: GitHub-backed CRM control plane',
    'Discord access: Read-only in this gate',
    '',
    'Privileged writes, approvals, payment actions, and identity changes remain disabled from Discord.'
  ].join('\n')
}

async function tenantSummary(env,tenant){
  const cfg=await fetchTenant(env,tenant)
  const modules=Array.isArray(cfg?.modules)?cfg.modules.join(', '):'not declared'
  const pipelines=Array.isArray(cfg?.pipelines)?cfg.pipelines.map(x=>x.name||x.id).filter(Boolean).join(', '):'not declared'
  return [
    `**NEO Relations Tenant: ${cfg?.name||tenant}**`,
    `ID: ${cfg?.id||tenant}`,
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

export async function handleRelationsCommand(interaction,env){
  const sub=String(interaction?.data?.options?.[0]?.name||'status')
  if(sub==='status')return relationsStatus(env)
  if(sub==='tenant')return tenantSummary(env,opt(interaction?.data?.options?.[0],'name')||'neo-prime')
  if(sub==='services')return serviceSummary(env)
  return 'Supported `/relations` subcommands in this gate: `status`, `tenant`, `services`.'
}
