import { verifyKey } from 'discord-interactions'

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const DISCORD_API='https://discord.com/api/v10'
const SYSTEM_PROMPT='You are NEOsync operating through an authorized Discord command surface. Be concise and useful. Never invent live telemetry, blockchain heights, balances, prices, transaction counts, validator counts, node counts, dates, system health, deployment state, or external-action results. Only state live/current facts when they were supplied by a connected tool, API, binding, or gateway runtime in this request. If live data is unavailable, say that clearly. Do not claim to have performed external actions unless a connected tool actually performed them.'

async function verifyDiscord(request,env,raw){
  const sig=request.headers.get('x-signature-ed25519')||''
  const ts=request.headers.get('x-signature-timestamp')||''
  const publicKey=String(env.DISCORD_PUBLIC_KEY||'').trim()
  if(!sig||!ts||!publicKey)return false
  return verifyKey(raw,sig,ts,publicKey)
}
function commandText(interaction){
  const options=interaction?.data?.options||[]
  const prompt=options.find(x=>x.name==='prompt')?.value
  return String(prompt||'').trim().slice(0,8000)
}
function actor(interaction){
  const user=interaction?.member?.user||interaction?.user||{}
  return {id:String(user.id||''),username:String(user.global_name||user.username||'Discord user'),guildId:String(interaction?.guild_id||''),channelId:String(interaction?.channel_id||'')}
}
function allowed(interaction,env){
  const allowUsers=String(env.DISCORD_ALLOWED_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)
  const allowGuilds=String(env.DISCORD_ALLOWED_GUILD_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)
  const a=actor(interaction)
  if(allowUsers.length&&!allowUsers.includes(a.id))return false
  if(allowGuilds.length&&a.guildId&&!allowGuilds.includes(a.guildId))return false
  return true
}
function extractOpenAIText(body){
  if(typeof body?.output_text==='string'&&body.output_text.trim())return body.output_text.trim()
  const chunks=[]
  for(const item of body?.output||[]){for(const part of item?.content||[]){if(typeof part?.text==='string')chunks.push(part.text);else if(typeof part?.output_text==='string')chunks.push(part.output_text)}}
  return chunks.join('\n').trim()
}
function extractWorkersAIText(body){
  if(typeof body==='string'&&body.trim())return body.trim()
  if(typeof body?.response==='string'&&body.response.trim())return body.response.trim()
  if(typeof body?.result?.response==='string'&&body.result.response.trim())return body.result.response.trim()
  if(typeof body?.text==='string'&&body.text.trim())return body.text.trim()
  return ''
}
function isStatusPrompt(prompt){
  const p=String(prompt||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()
  return p==='status'||p==='neo status'||p==='neo system status'||p==='give me the neo status'||p==='give me the neo system status'||p==='what is the neo system status'||p==='what s the neo system status'
}
function gatewayStatus(env){
  const workersModel=String(env.WORKERS_AI_MODEL||'@cf/meta/llama-3.1-8b-instruct-fp8')
  const providers=[]
  if(env.NEOSYNC_CHAT_URL)providers.push('NEOsync upstream')
  if(env.AI)providers.push(`Cloudflare Workers AI (${workersModel})`)
  if(env.OPENAI_API_KEY)providers.push('OpenAI (configured; quota may vary)')
  return [
    '**NEO System Gateway Status**',
    'Discord command surface: Online',
    'Gateway: neo-discord-api v1.3',
    `Workers AI: ${env.AI?'Online':'Not bound'}`,
    `OpenAI: ${env.OPENAI_API_KEY?'Configured':'Not configured'}`,
    `NEOsync upstream: ${env.NEOSYNC_CHAT_URL?'Configured':'Not configured'}`,
    `Provider priority: ${providers.length?providers.join(' → '):'No AI provider configured'}`,
    '',
    'Blockchain/market/treasury telemetry: Not reported unless a live data connector is queried.'
  ].join('\n')
}
async function askWorkersAI(env,prompt){
  if(!env.AI)throw new Error('Workers AI binding is not configured')
  const model=String(env.WORKERS_AI_MODEL||'@cf/meta/llama-3.1-8b-instruct-fp8')
  const result=await env.AI.run(model,{messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:prompt}]})
  const text=extractWorkersAIText(result)
  if(!text)throw new Error('Workers AI returned no text')
  return text
}
async function askOpenAI(env,prompt){
  if(!env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is not configured')
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${env.OPENAI_API_KEY}`},body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-5-mini',input:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:prompt}]}),signal:AbortSignal.timeout(45000)})
  const b=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(`OpenAI API returned ${r.status}: ${b?.error?.message||'request failed'}`)
  return extractOpenAIText(b)||'NEOsync returned no text.'
}
async function askNEO(env,prompt,a){
  if(isStatusPrompt(prompt))return gatewayStatus(env)
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
  try{return await askWorkersAI(env,prompt)}catch(err){errors.push(`Workers AI: ${String(err?.message||err)}`)}
  try{return await askOpenAI(env,prompt)}catch(err){errors.push(`OpenAI: ${String(err?.message||err)}`)}
  throw new Error(`No AI provider succeeded. ${errors.join(' | ')}`)
}
async function editInteraction(interaction,content){
  const text=String(content||'').slice(0,1900)
  const url=`${DISCORD_API}/webhooks/${encodeURIComponent(interaction.application_id)}/${encodeURIComponent(interaction.token)}/messages/@original`
  const r=await fetch(url,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:text||'No response.',allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(15000)})
  if(!r.ok)throw new Error(`Discord follow-up failed ${r.status}`)
}
async function processCommand(interaction,env){
  try{
    const prompt=commandText(interaction)
    if(!prompt){await editInteraction(interaction,'Give me a prompt, for example: `/neo prompt:Give me the NEO system status.`');return}
    const a=actor(interaction)
    const reply=await askNEO(env,prompt,a)
    await editInteraction(interaction,reply)
  }catch(err){
    await editInteraction(interaction,`NEOsync gateway error: ${String(err?.message||err).slice(0,1500)}`).catch(()=>{})
  }
}

export default {
  async fetch(request,env,ctx){
    const u=new URL(request.url)
    if(request.method==='GET'&&u.pathname==='/health')return json({ok:true,service:'neo-discord',version:'1.3',providers:{neosync_upstream:Boolean(env.NEOSYNC_CHAT_URL),workers_ai:Boolean(env.AI),openai:Boolean(env.OPENAI_API_KEY)},priority:['neosync-upstream','workers-ai','openai'],workers_ai_model:String(env.WORKERS_AI_MODEL||'@cf/meta/llama-3.1-8b-instruct-fp8'),grounded_status:true})
    if(request.method!=='POST'||(u.pathname!=='/'&&u.pathname!=='/discord/interactions'))return json({error:'Not found'},404)
    const raw=await request.text()
    let verified=false
    try{verified=await verifyDiscord(request,env,raw)}catch{}
    if(!verified)return json({error:'Invalid Discord signature'},401)
    let interaction
    try{interaction=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
    if(interaction.type===1)return json({type:1})
    if(interaction.type!==2)return json({type:4,data:{content:'Unsupported interaction type.',flags:64,allowed_mentions:{parse:[]}}})
    if(interaction?.data?.name!=='neo')return json({type:4,data:{content:'Unknown command.',flags:64,allowed_mentions:{parse:[]}}})
    if(!allowed(interaction,env))return json({type:4,data:{content:'This NEO command surface is not authorized for your account or server.',flags:64,allowed_mentions:{parse:[]}}})
    ctx.waitUntil(processCommand(interaction,env))
    return json({type:5,data:{flags:64}})
  }
}
