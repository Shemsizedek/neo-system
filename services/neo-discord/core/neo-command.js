import { counterpartyStatus } from './counterparty.js'
import { treasuryStatus, configuredWallets } from './treasury.js'

const DISCORD_API='https://discord.com/api/v10'
const GITHUB_REPO='Shemsizedek/neo-system'
export const SYSTEM_PROMPT='You are NEOsync operating through an authorized Discord command surface. Be concise and useful. Never invent live telemetry, blockchain heights, balances, prices, transaction counts, validator counts, node counts, dates, system health, deployment state, repository state, Counterparty state, asset supply, wallet balances, treasury balances, or external-action results. Only state live/current facts when they were supplied by a connected tool, API, binding, or gateway runtime in this request. If live data is unavailable, say that clearly. Do not claim to have performed external actions unless a connected tool actually performed them.'

export function commandText(interaction){
  const options=interaction?.data?.options||[]
  return String(options.find(x=>x.name==='prompt')?.value||'').trim().slice(0,8000)
}

export function discordActor(interaction){
  const user=interaction?.member?.user||interaction?.user||{}
  return {id:String(user.id||''),username:String(user.global_name||user.username||'Discord user'),guildId:String(interaction?.guild_id||''),channelId:String(interaction?.channel_id||'')}
}

function extractOpenAIText(body){
  if(typeof body?.output_text==='string'&&body.output_text.trim())return body.output_text.trim()
  const chunks=[]
  for(const item of body?.output||[])for(const part of item?.content||[]){
    if(typeof part?.text==='string')chunks.push(part.text)
    else if(typeof part?.output_text==='string')chunks.push(part.output_text)
  }
  return chunks.join('\n').trim()
}

function normalized(prompt){return String(prompt||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function isStatusPrompt(prompt){
  const p=normalized(prompt)
  return ['status','neo status','neo system status','give me the neo status','give me the neo system status','what is the neo system status','what s the neo system status'].includes(p)
}
function isGitHubStatusPrompt(prompt){
  const p=normalized(prompt)
  return p.includes('github')&&(p.includes('status')||p.includes('repo')||p.includes('repository')||p.includes('latest commit')||p.includes('open pr')||p.includes('pull request'))
}
function isTreasuryPrompt(prompt){
  const p=normalized(prompt)
  const source=p.includes('treasury')||p.includes('wallet')||p.includes('address balance')||p.includes('holdings')||p.includes('balances')
  const intent=p.includes('status')||p.includes('live')||p.includes('balance')||p.includes('holding')||p.includes('btc')||p.includes('xcp')||p.includes('nomni')||p.includes('counterparty')
  return source&&intent
}
function isCounterpartyStatusPrompt(prompt){
  const p=normalized(prompt)
  const source=p.includes('counterparty')||p.includes('xcp')||p.includes('nomni')
  const intent=p.includes('status')||p.includes('live')||p.includes('asset')||p.includes('supply')||p.includes('network')||p.includes('bitcoin')
  return source&&intent
}

export function gatewayStatus(env={},runtime={}){
  const providers=[]
  if(env.NEOSYNC_CHAT_URL)providers.push('NEOsync upstream')
  if(runtime.providerLabel)providers.push(runtime.providerLabel)
  if(env.OPENAI_API_KEY)providers.push('OpenAI (configured; quota may vary)')
  const walletCount=configuredWallets(env).length
  return [
    '**NEO System Gateway Status**','Discord command surface: Online',`Gateway: neo-discord-api ${runtime.version||'2.0'}`,
    `Runtime AI: ${runtime.providerLabel||'Not configured'}`,
    `OpenAI: ${env.OPENAI_API_KEY?'Configured':'Not configured'}`,
    `NEOsync upstream: ${env.NEOSYNC_CHAT_URL?'Configured':'Not configured'}`,
    `Provider priority: ${providers.length?providers.join(' → '):'No AI provider configured'}`,
    'Live GitHub source: Enabled for Shemsizedek/neo-system',
    'Live Counterparty source: Enabled for node/XCP/NOMNI reads',
    `Live treasury source: Enabled; configured public wallets: ${walletCount}`,
    'NEO asset-symbol policy: ∞ tokenized currencies; ₿ BTC; no symbol for ordinary assets/Orange Chip™ Stocks','',
    'Treasury reads are read-only through mempool.space + Counterparty v2. No private keys, signing, or broadcasting.'
  ].join('\n')
}

async function githubFetch(env,path){
  const headers={'accept':'application/vnd.github+json','user-agent':'neo-discord-api','x-github-api-version':'2022-11-28'}
  if(env.GITHUB_API_TOKEN)headers.authorization=`Bearer ${env.GITHUB_API_TOKEN}`
  const r=await fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`,{headers,signal:AbortSignal.timeout(12000)})
  const body=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(`GitHub ${r.status}: ${body?.message||'request failed'}`)
  return body
}

async function githubStatus(env){
  const [repo,commit,pulls]=await Promise.all([githubFetch(env,''),githubFetch(env,'/commits?per_page=1'),githubFetch(env,'/pulls?state=open&per_page=20')])
  const latest=Array.isArray(commit)?commit[0]:null
  const openPulls=Array.isArray(pulls)?pulls.length:0
  const latestMessage=String(latest?.commit?.message||'Unknown').split('\n')[0].slice(0,160)
  const latestSha=String(latest?.sha||'').slice(0,7)||'unknown'
  const pushed=repo?.pushed_at?new Date(repo.pushed_at).toISOString():'unknown'
  return ['**NEO GitHub Live Status**',`Repository: ${repo?.full_name||GITHUB_REPO}`,`Default branch: ${repo?.default_branch||'unknown'}`,`Open issues/PRs: ${Number(repo?.open_issues_count??0)}`,`Open pull requests: ${openPulls}`,`Latest commit: ${latestSha} — ${latestMessage}`,`Last push: ${pushed}`,`Visibility: ${repo?.visibility||'unknown'}`,'','Source: live GitHub REST API. No blockchain or market data inferred.'].join('\n')
}

async function askOpenAI(env,prompt){
  if(!env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is not configured')
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${env.OPENAI_API_KEY}`},body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-5-mini',input:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:prompt}]}),signal:AbortSignal.timeout(45000)})
  const b=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(`OpenAI API returned ${r.status}: ${b?.error?.message||'request failed'}`)
  return extractOpenAIText(b)||'NEOsync returned no text.'
}

export async function answerNeoPrompt(env,prompt,a,runtime={}){
  if(isStatusPrompt(prompt))return gatewayStatus(env,runtime)
  if(isGitHubStatusPrompt(prompt))return githubStatus(env)
  if(isTreasuryPrompt(prompt))return treasuryStatus(env)
  if(isCounterpartyStatusPrompt(prompt))return counterpartyStatus(env)
  if(env.NEOSYNC_CHAT_URL){
    const headers={'content-type':'application/json','x-neo-surface':'discord','x-neo-actor':a.id}
    if(env.NEOSYNC_CHAT_TOKEN)headers.authorization=`Bearer ${env.NEOSYNC_CHAT_TOKEN}`
    const r=await fetch(env.NEOSYNC_CHAT_URL,{method:'POST',headers,body:JSON.stringify({message:prompt,surface:'discord',actor:a}),signal:AbortSignal.timeout(45000)})
    if(!r.ok)throw new Error(`NEOsync backend returned ${r.status}`)
    const b=await r.json()
    const text=String(b.reply||b.message||b.output||'').trim()
    if(text)return text
  }
  const errors=[]
  if(typeof runtime.askRuntimeAI==='function'){
    try{return await runtime.askRuntimeAI(prompt,SYSTEM_PROMPT)}catch(err){errors.push(`${runtime.providerLabel||'Runtime AI'}: ${String(err?.message||err)}`)}
  }
  try{return await askOpenAI(env,prompt)}catch(err){errors.push(`OpenAI: ${String(err?.message||err)}`)}
  throw new Error(`No AI provider succeeded. ${errors.join(' | ')}`)
}

export async function editDiscordInteraction(interaction,content){
  const text=String(content||'').slice(0,1900)
  const url=`${DISCORD_API}/webhooks/${encodeURIComponent(interaction.application_id)}/${encodeURIComponent(interaction.token)}/messages/@original`
  const r=await fetch(url,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:text||'No response.',allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(15000)})
  if(!r.ok)throw new Error(`Discord follow-up failed ${r.status}`)
}

export async function processNeoCommand(interaction,env,runtime={}){
  try{
    const prompt=commandText(interaction)
    if(!prompt){await editDiscordInteraction(interaction,'Give me a prompt, for example: `/neo prompt:Give me the NEO system status.`');return}
    const reply=await answerNeoPrompt(env,prompt,discordActor(interaction),runtime)
    await editDiscordInteraction(interaction,reply)
  }catch(err){
    await editDiscordInteraction(interaction,`NEOsync gateway error: ${String(err?.message||err).slice(0,1500)}`).catch(()=>{})
  }
}

export function healthSnapshot(env={},runtime={}){
  return {ok:true,service:'neo-discord',version:runtime.version||'2.0',providers:{neosync_upstream:Boolean(env.NEOSYNC_CHAT_URL),runtime_ai:Boolean(runtime.providerLabel),openai:Boolean(env.OPENAI_API_KEY),github_live:true,counterparty_live:true,treasury_live:true},priority:['neosync-upstream','runtime-ai','openai'],runtime_ai:runtime.providerLabel||null,grounded_status:true,live_sources:['github','counterparty-v2','mempool-space'],configured_wallets:configuredWallets(env).length,asset_symbol_policy:{tokenized_currency:'∞',bitcoin:'₿',orange_chip_stock:'none',ordinary_asset:'none'}}
}
