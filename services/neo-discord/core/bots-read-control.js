import { parseCesAnnouncement } from '../../../server/neo-bots/ces-announcement-evidence.mjs'

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const csv=(value)=>String(value||'').split(',').map(x=>x.trim()).filter(Boolean)

function bearer(request){
  return String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')
}

function operatorIds(env={}){
  return [...new Set([...csv(env.DISCORD_OPERATOR_USER_IDS),...csv(env.NEO_BOTS_OPERATOR_IDS)])]
}

export async function handleBotsReadControl(request,env={}){
  const expected=String(env.NEO_BOTS_CONTROL_TOKEN||'')
  const supplied=bearer(request)
  if(!expected||!supplied||supplied!==expected)return json({error:'Unauthorized'},401)

  const actor=String(request.headers.get('x-neo-actor')||'').trim()
  const allowed=operatorIds(env)
  if(!actor||!allowed.includes(actor))return json({error:'operator authorization required'},403)

  const url=new URL(request.url)
  const prefix='/neo-bots/control'
  if(url.pathname===`${prefix}/health`&&request.method==='GET'){
    return json({ok:true,service:'neo-bots-read-control',mode:'read-only',cesWriteEnabled:false})
  }
  if(url.pathname===`${prefix}/approvals`&&request.method==='GET'){
    return json({approvals:[],mode:'read-only',storage:'no-write-queue-on-discord-worker'})
  }
  if(url.pathname===`${prefix}/announcement-evidence`&&request.method==='POST'){
    const body=await request.json().catch(()=>null)
    if(!body||typeof body.text!=='string'||!body.text.trim())return json({error:'announcement text is required'},400)
    const evidence=parseCesAnnouncement({id:body.id??null,date:body.date??null,title:body.title??'',text:body.text})
    return json({evidence,execution:'read-only',cesWriteExecuted:false})
  }
  if(url.pathname.startsWith(`${prefix}/approvals/`)&&request.method==='POST'){
    return json({error:'approval writes are disabled on the read-only Discord bridge'},405)
  }
  return json({error:'Not found'},404)
}
