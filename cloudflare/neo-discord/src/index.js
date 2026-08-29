import { verifyKey } from 'discord-interactions'
import { isDiscordActorAllowed } from '../../../services/neo-discord/core/authorization.js'
import { processNeoCommand, healthSnapshot, SYSTEM_PROMPT } from '../../../services/neo-discord/core/neo-command.js'

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})

async function verifyDiscord(request,env,raw){
  const sig=request.headers.get('x-signature-ed25519')||''
  const ts=request.headers.get('x-signature-timestamp')||''
  const publicKey=String(env.DISCORD_PUBLIC_KEY||'').trim()
  if(!sig||!ts||!publicKey)return false
  return verifyKey(raw,sig,ts,publicKey)
}

function extractWorkersAIText(body){
  if(typeof body==='string'&&body.trim())return body.trim()
  if(typeof body?.response==='string'&&body.response.trim())return body.response.trim()
  if(typeof body?.result?.response==='string'&&body.result.response.trim())return body.result.response.trim()
  if(typeof body?.text==='string'&&body.text.trim())return body.text.trim()
  return ''
}

function runtimeAdapter(env){
  const model=String(env.WORKERS_AI_MODEL||'@cf/meta/llama-3.1-8b-instruct-fp8')
  return {
    version:'2.0',
    providerLabel:env.AI?`Cloudflare Workers AI (${model})`:'',
    async askRuntimeAI(prompt,systemPrompt=SYSTEM_PROMPT){
      if(!env.AI)throw new Error('Workers AI binding is not configured')
      const result=await env.AI.run(model,{messages:[{role:'system',content:systemPrompt},{role:'user',content:prompt}]})
      const text=extractWorkersAIText(result)
      if(!text)throw new Error('Workers AI returned no text')
      return text
    }
  }
}

export default {
  async fetch(request,env,ctx){
    const u=new URL(request.url)
    const runtime=runtimeAdapter(env)
    if(request.method==='GET'&&u.pathname==='/health')return json(healthSnapshot(env,runtime))
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
    if(!isDiscordActorAllowed(interaction,env))return json({type:4,data:{content:'This NEO command surface is not authorized for your account or server.',flags:64,allowed_mentions:{parse:[]}}})
    ctx.waitUntil(processNeoCommand(interaction,env,runtime))
    return json({type:5,data:{flags:64}})
  }
}
