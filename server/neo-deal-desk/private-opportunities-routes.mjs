// NIBIRU-036: server-only NIA-013 route dispatcher. NOT mounted in production.
// Authentication comes from a server-issued HttpOnly NEOpass cookie;
// authorization comes only from the verified server-side membership lookup.
// Writes require the transactional opportunity writer, NOT the earlier
// nontransactional storage/audit service.
const COOKIE='neo_pass_session';
const BASE='/api/v1/deal-desk/private-opportunities';
const allowedOrigins = origin => /^https:\/\/(desk|egov)\.holytemples\.org$/.test(origin||'');
function cookieToken(header=''){
 const part=String(header).split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 if(!part)return null;
 try{return decodeURIComponent(part.slice(COOKIE.length+1))}catch{return null}
}
function json(status,body){return {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'},body:JSON.stringify(body)};}
export function createPrivateOpportunityRoutes({resolveSession,readService,writeService}={}){
 if(typeof resolveSession!=='function'||!readService?.list||!readService?.get||!writeService?.create||!writeService?.changeStage)throw Error('private_route_dependencies_required');
 return async function handle({method,path,headers={},body}={}){
  if(typeof path!=='string'||!(path===BASE||path.startsWith(BASE+'/')))return null;
  if(!['GET','POST','PATCH'].includes(method))return json(405,{error:'method_not_allowed'});
  // Cookie-authenticated mutations require explicit same-origin protection.
  if(method!=='GET'){
   if(!allowedOrigins(headers.origin)||headers['content-type']?.split(';')[0].trim()!=='application/json')
    return json(403,{error:'request_origin_denied'});
  }
  const token=cookieToken(headers.cookie);
  if(!token)return json(401,{error:'authentication_required'});
  let session;
  try{session=await resolveSession(token)}catch{return json(503,{error:'identity_unavailable'})}
  if(!session?.authenticated)return json(403,{error:'authorization_denied'});
  try{
   if(method==='GET'&&path===BASE)return json(200,{items:await readService.list({session})});
   const itemPath=path.slice(BASE.length+1);
   if(method==='GET'&&/^[-A-Z0-9_]{4,80}$/.test(itemPath))return json(200,{item:await readService.get({session,id:itemPath})});
   if(method==='POST'&&path===BASE)return json(201,{item:await writeService.create({session,input:body})});
   if(method==='PATCH'&&/^[-A-Z0-9_]{4,80}\/stage$/.test(itemPath)){
    const id=itemPath.slice(0,-6);
    return json(200,{item:await writeService.changeStage({session,id,stage:body?.stage})});
   }
   return json(404,{error:'route_not_found'});
  }catch(e){
   const status=[400,401,403,404,409].includes(e?.status)?e.status:
     /permission_denied/.test(e?.message||'')?403:/invalid_/.test(e?.message||'')?400:503;
   return json(status,{error:status===503?'operation_unavailable':e.code||e.message});
  }
 };
}
