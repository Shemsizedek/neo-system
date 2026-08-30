import { createNeoBotsAdminControlPlane } from './admin-control-plane.mjs';
import { parseCesAnnouncement } from './ces-announcement-evidence.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});

export function createNeoBotsAdminHttpHandler({runtimeFactory,tokenProvider,operatorPolicy}={}){
  if(typeof runtimeFactory!=='function')throw new Error('runtimeFactory is required');
  if(typeof tokenProvider!=='function')throw new Error('tokenProvider is required');
  return async function handle(request,context={}){
    const expected=String(await tokenProvider(context)||'');
    const supplied=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    if(!expected||!supplied||supplied!==expected)return json({error:'Unauthorized'},401);
    const runtime=runtimeFactory(context);
    const control=createNeoBotsAdminControlPlane({runtime,operatorPolicy:operatorPolicy||(()=>true)});
    const url=new URL(request.url);
    const actor={surface:'control-api',id:String(request.headers.get('x-neo-actor')||'discord-gateway')};
    if(request.method==='POST'&&url.pathname==='/announcement-evidence'){
      if(typeof operatorPolicy!=='function'||!operatorPolicy(actor))return json({error:'operator authorization required'},403);
      const body=await request.json().catch(()=>null);
      if(!body||typeof body.text!=='string'||!body.text.trim())return json({error:'announcement text is required'},400);
      const evidence=parseCesAnnouncement({id:body.id??null,date:body.date??null,title:body.title??'',text:body.text});
      return json({evidence,execution:'read-only',cesWriteExecuted:false});
    }
    if(request.method==='GET'&&url.pathname==='/approvals'){
      try{return json({approvals:control.listPending(actor)});}
      catch(err){return json({error:String(err?.message||err)},400);}
    }
    const match=url.pathname.match(/^\/approvals\/([^/]+)$/);
    if(request.method==='POST'&&match){
      const body=await request.json().catch(()=>null);
      if(!body||!['approved','rejected'].includes(body.decision))return json({error:'decision must be approved or rejected'},400);
      const forwarded=body.actor&&typeof body.actor==='object'?{surface:String(body.actor.surface||actor.surface),id:String(body.actor.id||actor.id)}:actor;
      try{return json({approval:control.resolve(forwarded,{approvalId:decodeURIComponent(match[1]),decision:body.decision})});}
      catch(err){return json({error:String(err?.message||err)},400);}
    }
    return json({error:'Not found'},404);
  };
}
