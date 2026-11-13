import http from 'node:http';
import https from 'node:https';

const PORT=Number(process.env.PORT||10000);
const PUBLIC_HOST=String(process.env.DEAL_DESK_PUBLIC_HOST||'desk.holytemples.org').trim();
const ORIGIN=String(process.env.DEAL_DESK_ORIGIN||'https://egov.holytemples.org').replace(/\/$/,'');

function json(res,status,body){
  const payload=JSON.stringify(body);
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'content-length':Buffer.byteLength(payload),
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  });
  res.end(payload);
}

export function mapDealDeskPath(pathname='/'){
  if(pathname==='/'||pathname==='/portal'||pathname==='/ui')return '/portal/deal-desk';
  return pathname;
}

export function rewriteLocation(value=''){
  return String(value)
    .replaceAll(ORIGIN,`https://${PUBLIC_HOST}`)
    .replaceAll('https://egov.holytemples.org',`https://${PUBLIC_HOST}`);
}

export function createDealDeskProxyServer(){
  return http.createServer((req,res)=>{
    const url=new URL(req.url||'/',`https://${PUBLIC_HOST}`);

    if(req.method==='GET'&&url.pathname==='/healthz'){
      return json(res,200,{ok:true,service:'neo-deal-desk-render-proxy',publicHost:PUBLIC_HOST,origin:ORIGIN});
    }

    let target;
    try{target=new URL(ORIGIN)}
    catch{return json(res,503,{error:'deal_desk_origin_invalid'})}

    const transport=target.protocol==='http:'?http:https;
    const upstreamPath=`${mapDealDeskPath(url.pathname)}${url.search}`;
    const headers={
      ...req.headers,
      host:target.host,
      'x-forwarded-host':PUBLIC_HOST,
      'x-forwarded-proto':'https',
      'accept-encoding':'identity'
    };

    const upstream=transport.request({
      hostname:target.hostname,
      port:target.port||undefined,
      path:upstreamPath,
      method:req.method,
      headers
    },reply=>{
      const responseHeaders={...reply.headers};
      delete responseHeaders['content-length'];
      responseHeaders['cache-control']='no-store';
      if(responseHeaders.location)responseHeaders.location=rewriteLocation(responseHeaders.location);

      const setCookie=responseHeaders['set-cookie'];
      if(Array.isArray(setCookie)){
        responseHeaders['set-cookie']=setCookie.map(cookie=>String(cookie).replace(/Domain=egov\.holytemples\.org;?/ig,''));
      }

      res.writeHead(reply.statusCode||502,responseHeaders);
      reply.pipe(res);
    });

    upstream.on('error',error=>json(res,502,{error:'deal_desk_upstream_unavailable',detail:String(error?.message||error)}));
    req.pipe(upstream);
  });
}

if(import.meta.url===`file://${process.argv[1]}`){
  createDealDeskProxyServer().listen(PORT,'0.0.0.0',()=>console.log(`NEO Deal Desk Render proxy listening on :${PORT} -> ${ORIGIN}`));
}
