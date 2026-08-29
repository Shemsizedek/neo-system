import { verifyKey } from 'discord-interactions'
import base from './index.js'
import { handleRelationsCommand } from './relations.js'
import { isDiscordActorAllowed } from '../../../services/neo-discord/core/authorization.js'

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const DISCORD_API='https://discord.com/api/v10'

async function verify(request,env,raw){
  const sig=request.headers.get('x-signature-ed25519')||''
  const ts=request.headers.get('x-signature-timestamp')||''
  const key=String(env.DISCORD_PUBLIC_KEY||'').trim()
  if(!sig||!ts||!key)return false
  return verifyKey(raw,sig,ts,key)
}
async function edit(interaction,content){
  const url=`${DISCORD_API}/webhooks/${encodeURIComponent(interaction.application_id)}/${encodeURIComponent(interaction.token)}/messages/@original`
  const r=await fetch(url,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:String(content||'').slice(0,1900),allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(15000)})
  if(!r.ok)throw new Error(`Discord follow-up failed ${r.status}`)
}
async function process(interaction,env){
  try{await edit(interaction,await handleRelationsCommand(interaction,env))}
  catch(err){await edit(interaction,`NEO Relations error: ${String(err?.message||err).slice(0,1500)}`).catch(()=>{})}
}

export default {
  async fetch(request,env,ctx){
    const u=new URL(request.url)
    if(request.method!=='POST'||(u.pathname!=='/'&&u.pathname!=='/discord/interactions'))return base.fetch(request,env,ctx)
    const clone=request.clone()
    const raw=await clone.text()
    let interaction
    try{interaction=JSON.parse(raw)}catch{return base.fetch(request,env,ctx)}
    if(interaction?.type!==2||interaction?.data?.name!=='relations')return base.fetch(request,env,ctx)
    let ok=false
    try{ok=await verify(request,env,raw)}catch{}
    if(!ok)return json({error:'Invalid Discord signature'},401)
    if(!isDiscordActorAllowed(interaction,env))return json({type:4,data:{content:'This NEO Relations command surface is not authorized for your account or server.',flags:64,allowed_mentions:{parse:[]}}})
    ctx.waitUntil(process(interaction,env))
    return json({type:5,data:{flags:64}})
  }
}
