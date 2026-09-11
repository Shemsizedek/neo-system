import http from 'node:http';

const SOURCE_ORIGIN = 'https://nuuniversitydot.wordpress.com';
const SOURCE_HOME = '/the-nu-univ-system/';
const PUBLIC_ORIGIN = 'https://university.holytemples.org';
const GISS_SCHOOL = 'https://egov.holytemples.org/portal/school';

function send(res,status,body,headers={}){
  const payload=Buffer.from(body);
  res.writeHead(status,{ 'content-length':payload.length, ...headers });
  res.end(payload);
}

function redirect(res,location,status=302){
  res.writeHead(status,{location,'cache-control':'no-store'});
  res.end();
}

function fallback(res,message='Nu University is temporarily unavailable.'){
  const body=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nu University | NEO GISS</title><style>body{margin:0;background:#0c1110;color:#f3f1e7;font:16px/1.55 system-ui,sans-serif}main{max-width:820px;margin:auto;padding:8vh 1.25rem}h1{font:700 clamp(2.5rem,7vw,5rem)/1 Georgia,serif;margin:.3rem 0 1rem}.k{color:#d5b45f;text-transform:uppercase;letter-spacing:.16em;font-size:.78rem;font-weight:800}.card{margin-top:2rem;padding:1.2rem;border:1px solid #35403a;background:#151b18;border-radius:14px}a{color:#e6c979}</style></head><body><main><div class="k">Global Interdependent School District</div><h1>Nu University</h1><p>${message}</p><div class="card"><strong>NEO GISS School</strong><p>Authenticated classes, assignments, teachers, and learning records continue through the NEO GISS platform.</p><a href="${GISS_SCHOOL}">Enter NEO GISS School →</a></div><div class="card"><strong>Legacy Nu University System</strong><p>The historical WordPress university system remains the source site for this public university surface.</p><a href="${SOURCE_ORIGIN}${SOURCE_HOME}">Open source page →</a></div></main></body></html>`;
  return send(res,503,body,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
}

function universityBar(){
  return `<style id="neo-university-shell">.neo-university-bar{position:sticky;top:0;z-index:2147483000;display:flex;align-items:center;gap:14px;padding:10px 16px;background:#101613;color:#f4f0e2;border-bottom:1px solid #6d5a2c;font:600 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.neo-university-bar strong{font-family:Georgia,serif;letter-spacing:.04em}.neo-university-bar span{color:#bdb6a4}.neo-university-bar a{margin-left:auto!important;padding:8px 13px!important;border-radius:999px!important;background:#d6b665!important;color:#11160f!important;text-decoration:none!important;font-weight:800!important;white-space:nowrap}@media(max-width:620px){.neo-university-bar span{display:none}.neo-university-bar{padding:9px 10px;font-size:13px}.neo-university-bar a{padding:7px 10px!important}}</style><div class="neo-university-bar" role="navigation" aria-label="Nu University"><strong>NU UNIVERSITY</strong><span>Global Interdependent School District · NEO GISS</span><a href="/giss">Enter NEO GISS School →</a></div>`;
}

function rewriteHtml(html){
  const rewritten=html
    .replaceAll(SOURCE_ORIGIN,PUBLIC_ORIGIN)
    .replace(/<head([^>]*)>/i,`<head$1><base href="${PUBLIC_ORIGIN}/">`)
    .replace(/<title>(.*?)<\/title>/i,'<title>$1 | Nu University</title>');
  return /<body([^>]*)>/i.test(rewritten)
    ? rewritten.replace(/<body([^>]*)>/i,`<body$1>${universityBar()}`)
    : `${universityBar()}${rewritten}`;
}

async function proxy(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD') return send(res,405,'Method Not Allowed',{'content-type':'text/plain; charset=utf-8','allow':'GET, HEAD'});
  const incoming=new URL(req.url||'/',PUBLIC_ORIGIN);
  if(incoming.pathname==='/health') return send(res,200,JSON.stringify({service:'neo-nu-university',status:'ok',source:SOURCE_ORIGIN,giss:GISS_SCHOOL}),{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  if(incoming.pathname==='/giss'||incoming.pathname==='/login'||incoming.pathname==='/portal') return redirect(res,GISS_SCHOOL,302);
  const targetPath=incoming.pathname==='/'?SOURCE_HOME:incoming.pathname;
  const target=new URL(targetPath+incoming.search,SOURCE_ORIGIN);
  let upstream;
  try{
    upstream=await fetch(target,{redirect:'manual',headers:{'user-agent':'NEO-Nu-University-Proxy/1.1 (+https://holytemples.org)'}});
  }catch(error){
    console.error('Nu University upstream fetch failed',error?.message||error);
    return fallback(res);
  }
  if(upstream.status>=300&&upstream.status<400){
    const location=upstream.headers.get('location');
    if(!location) return fallback(res,'The university source returned an incomplete redirect.');
    const next=new URL(location,target);
    const publicLocation=next.origin===SOURCE_ORIGIN?`${PUBLIC_ORIGIN}${next.pathname}${next.search}${next.hash}`:next.toString();
    res.writeHead(upstream.status,{location:publicLocation,'cache-control':'no-store'}); return res.end();
  }
  const type=upstream.headers.get('content-type')||'application/octet-stream';
  if(type.includes('text/html')){
    const html=rewriteHtml(await upstream.text());
    if(req.method==='HEAD'){res.writeHead(upstream.status,{'content-type':type,'cache-control':'public, max-age=120','x-content-type-options':'nosniff'});return res.end();}
    return send(res,upstream.status,html,{'content-type':type,'cache-control':'public, max-age=120','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'});
  }
  const data=Buffer.from(await upstream.arrayBuffer());
  const headers={'content-type':type,'cache-control':upstream.headers.get('cache-control')||'public, max-age=300','x-content-type-options':'nosniff'};
  if(req.method==='HEAD'){res.writeHead(upstream.status,headers);return res.end();}
  res.writeHead(upstream.status,{'content-length':data.length,...headers});res.end(data);
}

const port=Number(process.env.PORT||8080);
http.createServer((req,res)=>proxy(req,res).catch(error=>{console.error(error);fallback(res);})).listen(port,()=>console.log(`Nu University proxy listening on :${port}`));
