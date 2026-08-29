import { isDiscordActorAllowed } from './authorization.js'
import { processNeoCommand, healthSnapshot } from './neo-command.js'
import { handleRelationsCommand } from './relations.js'

export const discordJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})

export async function editDiscordInteraction(interaction,content,fetchImpl=fetch){
  const url=`https://discord.com/api/v10/webhooks/${encodeURIComponent(interaction.application_id)}/${encodeURIComponent(interaction.token)}/messages/@original`
  const r=await fetchImpl(url,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:String(content||'').slice(0,1900),allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(15000)})
  if(!r.ok)throw new Error(`Discord follow-up failed ${r.status}`)
}

export async function processRelationsCommand(interaction,env,{fetchImpl=fetch}={}){
  try{await editDiscordInteraction(interaction,await handleRelationsCommand(interaction,env),fetchImpl)}
  catch(err){await editDiscordInteraction(interaction,`NEO Relations error: ${String(err?.message||err).slice(0,1500)}`,fetchImpl).catch(()=>{})}
}

export function healthResponse(env,runtime,transportAdapter){
  return discordJson({...healthSnapshot(env,runtime),transport_adapter:transportAdapter})
}

export async function dispatchVerifiedInteraction(interaction,env,runtime,{waitUntil=(p)=>p,fetchImpl=fetch}={}){
  if(interaction.type===1)return discordJson({type:1})
  if(interaction.type!==2)return discordJson({type:4,data:{content:'Unsupported interaction type.',flags:64,allowed_mentions:{parse:[]}}})
  if(!isDiscordActorAllowed(interaction,env))return discordJson({type:4,data:{content:'This NEO command surface is not authorized for your account or server.',flags:64,allowed_mentions:{parse:[]}}})
  const command=String(interaction?.data?.name||'')
  if(command==='neo')waitUntil(processNeoCommand(interaction,env,runtime))
  else if(command==='relations')waitUntil(processRelationsCommand(interaction,env,{fetchImpl}))
  else return discordJson({type:4,data:{content:'Unknown command.',flags:64,allowed_mentions:{parse:[]}}})
  return discordJson({type:5,data:{flags:64}})
}
