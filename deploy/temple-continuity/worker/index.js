// SNAPSHOTS is injected from versioned public source by scripts/build.mjs.
const PORTAL_ORIGIN = 'https://neo-platform-api-recovery.onrender.com';
const ALLOWED_ORIGINS = new Set(['https://egov.holytemples.org', 'https://neo.holytemples.org', 'https://hub.holytemples.org', 'https://holytemples.org', 'https://temple-continuity.shemsizedek.chatgpt.site']);
const json = (value, status=200) => new Response(JSON.stringify(value), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const text = (body, type='text/html; charset=utf-8', status=200) => new Response(body, {status, headers:{'content-type':type,'cache-control':'public, max-age=60','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});

export async function forwardPortal(request, fetchImpl=fetch) {
  const source=new URL(request.url);
  const origin=request.headers.get('origin');
  if (!['GET','HEAD','OPTIONS'].includes(request.method) && (!origin || !ALLOWED_ORIGINS.has(origin) || request.headers.get('sec-fetch-site')==='cross-site')) return json({error:'cross_site_request_blocked'},403);
  const target=new URL(source.pathname+source.search,PORTAL_ORIGIN);
  const headers=new Headers(request.headers);
  for(const name of ['host','x-forwarded-host','x-forwarded-for','cf-connecting-ip','x-neopass-subject','x-neopass-role']) headers.delete(name);
  headers.set('x-forwarded-proto','https');
  try {
    const response=await fetchImpl(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual',signal:AbortSignal.timeout(15000)});
    const resultHeaders=new Headers(response.headers);
    resultHeaders.set('cache-control','no-store');
    const location=resultHeaders.get('location');
    if(location){const redirect=new URL(location,target);if(redirect.origin===PORTAL_ORIGIN)resultHeaders.set('location',redirect.pathname+redirect.search+redirect.hash);}
    return new Response(response.body,{status:response.status,headers:resultHeaders});
  } catch { return json({error:'member_service_temporarily_unavailable',message:'Please try again or contact the Temple. No account changes were confirmed.'},503); }
}

export function createGateway(snapshots,fetchImpl=fetch) {
  return {async fetch(request){
    const url=new URL(request.url);
    const path=url.pathname;
    const isPortal=url.hostname==='egov.holytemples.org'||url.hostname==='temple-continuity.shemsizedek.chatgpt.site';
    if(path==='/health'||path==='/healthz')return json({ok:true,service:'temple-continuity',mode:'public-recovery',memberServices:'separately-authenticated',generatedAt:new Date().toISOString()});
    if(path==='/robots.txt')return text('User-agent: *\nAllow: /\nDisallow: /portal\nDisallow: /api/\n','text/plain; charset=utf-8');
    if(path==='/favicon.ico'||path==='/favicon.png'||path==='/apple-touch-icon.png')return Response.redirect('https://holytemples.org/wp-content/uploads/2026/09/holy-keys-transparent-master.png',302);
    if(isPortal){
      if(request.method==='GET'&&Object.hasOwn(snapshots.portal,path))return text(snapshots.portal[path],path.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');
      return forwardPortal(request,fetchImpl);
    }
    if(!['GET','HEAD','OPTIONS'].includes(request.method))return json({error:'service_temporarily_unavailable'},503);
    if(Object.hasOwn(snapshots.assets,path))return text(snapshots.assets[path],'text/javascript; charset=utf-8');
    if(path==='/'||path==='/ui')return text(url.hostname==='hub.holytemples.org'?snapshots.pages.hub:snapshots.pages.system);
    if(path==='/api/library'||path==='/library')return json({records:snapshots.records,accessClass:'PUBLIC_WORLD_LIBRARY'});
    if(path==='/api/noogle/search'||path==='/noogle/search'){
      const query=(url.searchParams.get('q')||'').trim().toLowerCase().slice(0,200);
      const terms=query.split(/\s+/).filter(Boolean);
      const records=terms.length?snapshots.records.filter(record=>terms.every(term=>JSON.stringify(record).toLowerCase().includes(term))):[];
      return json({records,engine:'Noogle public library search',accessClass:'PUBLIC_WORLD_LIBRARY'});
    }
    if(path.startsWith('/api/library/')){
      let id;try{id=decodeURIComponent(path.slice('/api/library/'.length));}catch{return json({error:'invalid_record_id'},400);}
      const record=snapshots.details[id];return record?json({record,oracleClass:'internal-record-context'}):json({error:'library_record_not_found'},404);
    }
    if(path==='/api'||path==='/services')return json({service:'temple-continuity',mode:'public-recovery',services:[{name:'Templist Portal',host:'egov.holytemples.org',url:'https://egov.holytemples.org',role:'member-portal'},{name:'NEO System',host:'neo.holytemples.org',url:'https://neo.holytemples.org',role:'public-workspace'},{name:'NEO Hub',host:'hub.holytemples.org',url:'https://hub.holytemples.org',role:'public-hub'}]});
    if(path.startsWith('/api/'))return json({error:'upstream_service_recovery_in_progress'},503);
    if(path==='/neosync'||path==='/neosync/')return text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEOsync · Service recovery</title><body style="font:18px/1.7 system-ui;max-width:680px;margin:10vh auto;padding:24px"><h1>NEOsync is recovering</h1><p>The conversation service is temporarily unavailable. The public library and Temple Portal remain accessible.</p><p><a href="/#library">Search public records</a> · <a href="https://egov.holytemples.org/">Temple Portal</a></p></body></html>',undefined,503);
    return text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Service recovery · World Temple</title><body style="font:18px/1.7 system-ui;max-width:680px;margin:10vh auto;padding:24px"><h1>This service is still recovering.</h1><p><a href="/">Return to the public workspace</a> or <a href="https://holytemples.org/contact/">contact the Temple</a>.</p></body></html>',undefined,503);
  }};
}

export default createGateway(SNAPSHOTS);
