import { verifyKey } from 'discord-interactions'
import { SYSTEM_PROMPT } from '../../core/neo-command.js'
import { createDiscordHttpHandler } from '../../core/interaction.js'

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
    id:'cloudflare-worker',
    version:'1.2',
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

const handle=createDiscordHttpHandler({
  transportAdapter:'cloudflare-worker',
  runtimeFactory:runtimeAdapter,
  verifySignature:async({request,env,raw})=>{
    const sig=request.headers.get('x-signature-ed25519')||''
    const ts=request.headers.get('x-signature-timestamp')||''
    const key=String(env.DISCORD_PUBLIC_KEY||'').trim()
    if(!sig||!ts||!key)return false
    return verifyKey(raw,sig,ts,key)
  }
})

export default {
  fetch(request,env,ctx){
    return handle(request,env,{waitUntil:(p)=>ctx.waitUntil(p),fetchImpl:ctx.fetchImpl})
  }
}
