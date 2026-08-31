import { verifyKey } from 'discord-interactions'
import { SYSTEM_PROMPT } from '../../core/neo-command.js'
import { createDiscordHttpHandler } from '../../core/interaction.js'
import { parseCesAnnouncement } from '../../../../server/neo-bots/ces-announcement-evidence.mjs'

function extractWorkersAIText(body){
  if(typeof body==='string'&&body.trim())return body.trim()
  if(typeof body?.response==='string'&&body.response.trim())return body.response.trim()
  if(typeof body?.result?.response==='string'&&body.result.response.trim())return body.result.response.trim()
  if(typeof body?.text==='string'&&body.text.trim())return body.text.trim()
  return ''
}

function csv(value){return String(value||'').split(',').map(x=>x.trim()).filter(Boolean)}
function controlJson(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function controlAuthorized(request,env){
  const expected=String(env.NEO_BOTS_CONTROL_TOKEN||'')
  const supplied=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')
  if(!expected||!supplied||supplied!==expected)return {ok:false,status:401,error:'Unauthorized'}
  const actor=String(request.headers.get('x-neo-actor')||'').trim()
  if(!actor)return {ok:false,status:403,error:'operator authorization required'}
  const allowed=csv(env.DISCORD_OPERATOR_USER_IDS)
  if(!allowed.length||!allowed.includes(actor))return {ok:false,status:403,error:'operator authorization required'}
  return {ok:true,actor}
}

async function handleNeoBotsControl(request,env){
  const url=new URL(request.url)
  if(request.method==='GET'&&url.pathname==='/neo-bots/health'){
    return controlJson({ok:true,service:'neo-bots-control',mode:'discord-worker-read-only',operatorAllowlistConfigured:csv(env.DISCORD_OPERATOR_USER_IDS).length>0,controlTokenConfigured:Boolean(env.NEO_BOTS_CONTROL_TOKEN),liveCesExecutionEnabled:false})
  }
  if(url.pathname!=='/neo-bots/control'&&!url.pathname.startsWith('/neo-bots/control/'))return null
  const auth=controlAuthorized(request,env)
  if(!auth.ok)return controlJson({error:auth.error},auth.status)
  const path=url.pathname.slice('/neo-bots/control'.length)||'/'
  if(request.method==='GET'&&path==='/approvals')return controlJson({approvals:[],mode:'read-only-worker',durableApprovalQueue:false})
  if(request.method==='POST'&&path==='/announcement-evidence'){
    const body=await request.json().catch(()=>null)
    if(!body||typeof body.text!=='string'||!body.text.trim())return controlJson({error:'announcement text is required'},400)
    const evidence=parseCesAnnouncement({id:body.id??null,date:body.date??null,title:body.title??'',text:body.text})
    return controlJson({evidence,execution:'read-only',cesWriteExecuted:false})
  }
  if(request.method==='POST'&&/^\/approvals\//.test(path))return controlJson({error:'approval resolution is disabled on the Discord-hosted read-only control surface'},409)
  return controlJson({error:'Not found'},404)
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
  async fetch(request,env,ctx){
    const control=await handleNeoBotsControl(request,env)
    if(control)return control
    return handle(request,env,{waitUntil:(p)=>ctx.waitUntil(p),fetchImpl:ctx.fetchImpl})
  }
}
