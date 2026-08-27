const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const DISCORD_API='https://discord.com/api/v10'

function hexBytes(hex,expectedBytes,label='hex value'){
  const value=String(hex||'')
  const expectedChars=expectedBytes*2
  if(!new RegExp(`^[0-9a-f]{${expectedChars}}$`,'i').test(value))throw new Error(`${label} must be ${expectedChars} hex characters`)
  const out=new Uint8Array(expectedBytes)
  for(let i=0;i<expectedBytes;i++)out[i]=parseInt(value.slice(i*2,i*2+2),16)
  return out
}
async function verifyDiscord(request,env,raw){
  const sig=request.headers.get('x-signature-ed25519')
  const ts=request.headers.get('x-signature-timestamp')
  if(!sig||!ts||!env.DISCORD_PUBLIC_KEY)return false
  const key=await crypto.subtle.importKey('raw',hexBytes(env.DISCORD_PUBLIC_KEY,32,'DISCORD_PUBLIC_KEY'),{name:'Ed25519'},false,['verify'])
  const signature=hexBytes(sig,64,'Discord signature')
  const message=new TextEncoder().encode(ts+raw)
  return crypto.subtle.verify({name:'Ed25519'},key,signature,message)
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
async function askNEO(env,prompt,a){
  if(env.NEOSYNC_CHAT_URL){
    const headers={'content-type':'application/json','x-neo-surface':'discord','x-neo-actor':a.id}
    if(env.NEOSYNC_CHAT_TOKEN)headers.authorization=`Bearer ${env.NEOSYNC_CHAT_TOKEN}`
    const r=await fetch(env.NEOSYNC_CHAT_URL,{method:'POST',headers,body:JSON.stringify({message:prompt,surface:'discord',actor:a}),signal:AbortSignal.timeout(45000)})
    if(!r.ok)throw new Error(`NEOsync backend returned ${r.status}`)
    const b=await r.json()
    const text=String(b.reply||b.message||b.output||'').trim()
    if(text)return text
  }
  if(!env.OPENAI_API_KEY)throw new Error('Neither NEOSYNC_CHAT_URL nor OPENAI_API_KEY is configured')
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${env.OPENAI_API_KEY}`},body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-5-mini',input:[{role:'system',content:'You are NEOsync operating through an authorized Discord command surface. Be concise, useful, and do not claim to have performed external actions unless a connected tool actually performed them.'},{role:'user',content:prompt}]}),signal:AbortSignal.timeout(45000)})
  const b=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(`OpenAI API returned ${r.status}: ${b?.error?.message||'request failed'}`)
  return extractOpenAIText(b)||'NEOsync returned no text.'
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
    if(request.method==='GET'&&u.pathname==='/health')return json({ok:true,service:'neo-discord',version:'1.0',ai:env.NEOSYNC_CHAT_URL?'neosync-upstream':env.OPENAI_API_KEY?'openai':'unconfigured'})
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
