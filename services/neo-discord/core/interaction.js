import { isDiscordActorAllowed, discordActor } from './authorization.js'
import { processNeoCommand, healthSnapshot } from './neo-command.js'
import { handleRelationsCommand } from './relations.js'
import { handleServicesCommand } from './service-registry.js'
import { processBotsCommand } from './bots.js'
import { createOperatorAuditReceipt, emitOperatorAuditReceipt } from './operator-audit.js'

export const discordJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})

export async function editDiscordInteraction(interaction,content,fetchImpl=fetch){
  const url=`https://discord.com/api/v10/webhooks/${encodeURIComponent(interaction.application_id)}/${encodeURIComponent(interaction.token)}/messages/@original`
  const r=await fetchImpl(url,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:String(content||'').slice(0,1900),allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(15000)})
  if(!r.ok)throw new Error(`Discord follow-up failed ${r.status}`)
}

function commandOption(interaction,name){return interaction?.data?.options?.find(x=>x.name===name)?.value}
function operatorOutcome(content){
  const text=String(content||'')
  if(text.includes('NOT AUTHORIZED'))return 'denied'
  if(text.includes('NOT CONFIGURED'))return 'not-configured'
  if(text.includes('UNREACHABLE'))return 'unreachable'
  const http=text.match(/Protected source: HTTP\s+(\d{3})/i)
  if(http)return `http-${http[1]}`
  return 'success'
}

export async function processRelationsCommand(interaction,env,{fetchImpl=fetch}={}){
  try{await editDiscordInteraction(interaction,await handleRelationsCommand(interaction,env,{fetchImpl}),fetchImpl)}
  catch(err){await editDiscordInteraction(interaction,`NEO Relations error: ${String(err?.message||err).slice(0,1500)}`,fetchImpl).catch(()=>{})}
}

export async function processServicesCommand(interaction,env,{fetchImpl=fetch,cryptoImpl=globalThis.crypto,logger=console}={}){
  try{
    let content=await handleServicesCommand(interaction,env,{fetchImpl})
    if(String(commandOption(interaction,'action')||'').toLowerCase()==='operator'){
      const actor=discordActor(interaction)
      const receipt=await createOperatorAuditReceipt({
        actorId:actor.id,
        guildId:actor.guildId,
        service:String(commandOption(interaction,'service')||'unknown'),
        outcome:operatorOutcome(content),
        correlationId:String(interaction?.id||'none'),
        at:new Date().toISOString()
      },{cryptoImpl})
      emitOperatorAuditReceipt(receipt,{logger})
      content=`${content}\nAudit receipt: ${receipt.receiptId}`.slice(0,1900)
    }
    await editDiscordInteraction(interaction,content,fetchImpl)
  }catch(err){await editDiscordInteraction(interaction,`NEO Services error: ${String(err?.message||err).slice(0,1500)}`,fetchImpl).catch(()=>{})}
}

export function healthResponse(env,runtime,transportAdapter){
  return discordJson({...healthSnapshot(env,runtime),transport_adapter:transportAdapter})
}

export async function dispatchVerifiedInteraction(interaction,env,runtime,{waitUntil=(p)=>p,fetchImpl=fetch}={}){
  if(interaction.type===1)return discordJson({type:1})
  if(interaction.type!==2)return discordJson({type:4,data:{content:'Unsupported interaction type.',flags:64,allowed_mentions:{parse:[]}}})
  if(!isDiscordActorAllowed(interaction,env))return discordJson({type:4,data:{content:'This NEO command surface is not authorized for your account or server.',flags:64,allowed_mentions:{parse:[]}}})
  const command=String(interaction?.data?.name||'')
  if(command==='neo')waitUntil(processNeoCommand(interaction,env,runtime,fetchImpl))
  else if(command==='relations')waitUntil(processRelationsCommand(interaction,env,{fetchImpl}))
  else if(command==='services')waitUntil(processServicesCommand(interaction,env,{fetchImpl}))
  else if(command==='bots')waitUntil(processBotsCommand(interaction,env,{fetchImpl}))
  else return discordJson({type:4,data:{content:'Unknown command.',flags:64,allowed_mentions:{parse:[]}}})
  return discordJson({type:5,data:{flags:64}})
}

export function createDiscordHttpHandler({transportAdapter,runtimeFactory,verifySignature}){
  if(typeof runtimeFactory!=='function')throw new Error('runtimeFactory is required')
  if(typeof verifySignature!=='function')throw new Error('verifySignature is required')
  return async function handleDiscordHttpRequest(request,env={},context={}){
    const u=new URL(request.url)
    const runtime=runtimeFactory(env)
    if(request.method==='GET'&&u.pathname==='/health')return healthResponse(env,runtime,transportAdapter)
    if(request.method!=='POST'||(u.pathname!=='/'&&u.pathname!=='/discord/interactions'))return discordJson({error:'Not found'},404)
    const raw=await request.text()
    let verified=false
    try{verified=await verifySignature({request,env,raw})}catch{}
    if(!verified)return discordJson({error:'Invalid Discord signature'},401)
    let interaction
    try{interaction=JSON.parse(raw)}catch{return discordJson({error:'Invalid JSON'},400)}
    return dispatchVerifiedInteraction(interaction,env,runtime,{waitUntil:context.waitUntil||((p)=>p),fetchImpl:context.fetchImpl||fetch})
  }
}
