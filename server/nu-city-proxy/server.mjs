import http from 'node:http';

const SOURCE_ORIGIN = 'https://nuuniversitytxdot.wordpress.com';
const PUBLIC_ORIGIN = 'https://city.holytemples.org';
const GISS_SCHOOL = 'https://egov.holytemples.org/portal/school';
const SERVICE_NAME = 'neo-nu-city';

const HOP_BY_HOP = new Set([
  'connection','keep-alive','proxy-authenticate','proxy-authorization',
  'te','trailer','transfer-encoding','upgrade','host','content-length'
]);

function send(res,status,body,headers={}){
  const payload=Buffer.isBuffer(body)?body:Buffer.from(body);
  res.writeHead(status,{'content-length':payload.length,...headers});
  res.end(payload);
}

function redirect(res,location,status=302){
  res.writeHead(status,{location,'cache-control':'no-store','x-neo-proxy':'city-holytemples'});
  res.end();
}

function rewrite(value=''){
  return String(value)
    .replaceAll('https://nuuniversitytxdot.wordpress.com',PUBLIC_ORIGIN)
    .replaceAll('http://nuuniversitytxdot.wordpress.com',PUBLIC_ORIGIN)
    .replaceAll('//nuuniversitytxdot.wordpress.com','//city.holytemples.org');
}

function copyRequestHeaders(req){
  const headers=new Headers();
  for(const [key,value] of Object.entries(req.headers)){
    if(value==null||HOP_BY_HOP.has(key.toLowerCase())) continue;
    headers.set(key,Array.isArray(value)?value.join(', '):value);
  }
  headers.set('host','nuuniversitytxdot.wordpress.com');
  headers.set('x-forwarded-host','city.holytemples.org');
  headers.set('x-forwarded-proto','https');
  headers.set('user-agent',headers.get('user-agent')||'NEO-City-Proxy/1.1 (+https://holytemples.org)');
  return headers;
}

async function proxy(req,res){
  const incoming=new URL(req.url||'/',PUBLIC_ORIGIN);
  if(incoming.pathname==='/health'){
    return send(res,200,JSON.stringify({service:SERVICE_NAME,status:'ok',source:SOURCE_ORIGIN,public:PUBLIC_ORIGIN,giss:GISS_SCHOOL}),{
      'content-type':'application/json; charset=utf-8','cache-control':'no-store'
    });
  }

  if(incoming.pathname==='/giss'||incoming.pathname==='/login'||incoming.pathname==='/portal'){
    return redirect(res,GISS_SCHOOL,302);
  }

  const target=new URL(incoming.pathname+incoming.search,SOURCE_ORIGIN);
  const init={method:req.method,headers:copyRequestHeaders(req),redirect:'manual'};
  if(!['GET','HEAD'].includes(req.method||'GET')){
    const chunks=[];
    for await(const chunk of req) chunks.push(chunk);
    init.body=Buffer.concat(chunks);
  }

  let upstream;
  try{
    upstream=await fetch(target,init);
  }catch(error){
    console.error('City upstream fetch failed',error?.message||error);
    return send(res,502,'City source is temporarily unavailable.',{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});
  }

  if(upstream.status>=300&&upstream.status<400){
    const location=upstream.headers.get('location');
    if(location){
      const next=new URL(location,target);
      const mapped=next.origin===SOURCE_ORIGIN
        ? `${PUBLIC_ORIGIN}${next.pathname}${next.search}${next.hash}`
        : rewrite(next.toString());
      res.writeHead(upstream.status,{location:mapped,'cache-control':'no-store','x-neo-proxy':'city-holytemples'});
      return res.end();
    }
  }

  const type=upstream.headers.get('content-type')||'application/octet-stream';
  const outHeaders={
    'content-type':type,
    'cache-control':upstream.headers.get('cache-control')||'public, max-age=120',
    'x-content-type-options':'nosniff',
    'referrer-policy':'strict-origin-when-cross-origin',
    'x-neo-proxy':'city-holytemples'
  };

  if(req.method==='HEAD'){
    res.writeHead(upstream.status,outHeaders);
    return res.end();
  }

  if(/text\/(html|css|javascript)|application\/(javascript|json|xml|rss\+xml|atom\+xml)|image\/svg\+xml/i.test(type)){
    return send(res,upstream.status,rewrite(await upstream.text()),outHeaders);
  }

  return send(res,upstream.status,Buffer.from(await upstream.arrayBuffer()),outHeaders);
}

const port=Number(process.env.PORT||8080);
http.createServer((req,res)=>proxy(req,res).catch(error=>{
  console.error('City proxy error',error);
  send(res,502,'City proxy error',{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});
})).listen(port,()=>console.log(`NEO City proxy listening on :${port}`));
