import http from 'node:http';

const port = Number(process.env.PORT || 10000);
const searchHome = 'https://noogle.holytemples.org/';
const denyHeaders = {
  'cache-control': 'no-store, private',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'"
};
const json = (res, status, body) => {
  res.writeHead(status, { ...denyHeaders, 'content-type':'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

// Curated public navigation only. No production indexes or private NEO data.
const publicCatalog = Object.freeze([
  { title:'World Temple of Karast',url:'https://holytemples.org/',tags:'temple ministry public'},
  { title:'World Education',url:'https://holytemples.org/holy-orders/',tags:'ministry education orders'},
  { title:'NEO System GitHub',url:'https://github.com/Shemsizedek/neo-system',tags:'neo development code'},
  { title:'Noogle production',url:'https://noogle.holytemples.org/',tags:'noogle search production'}
]);
export function createStagingServer() {
  return http.createServer((req,res) => {
    let pathname;
    try { pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname; }
    catch { return json(res,400,{error:'invalid_request'}); }
    if(req.method === 'GET' && pathname === '/search') {
      const query=new URL(req.url,'http://127.0.0.1').searchParams.get('q')?.trim().slice(0,100) || '';
      const terms=query.toLowerCase().split(/\s+/).filter(Boolean);
      const results=terms.length ? publicCatalog.filter(item=>terms.every(term=>(item.title+' '+item.tags).toLowerCase().includes(term))) : publicCatalog;
      return json(res,200,{mode:'curated-public-preview',liveIndex:false,query,results,count:results.length});
    }
    if(req.method === 'GET' && pathname === '/healthz')
      return json(res,200,{ok:true,service:'noogle-connect-render-staging',mode:'read-only'});
    if(req.method === 'GET' && pathname === '/') {
      res.writeHead(200,{
        'content-type':'text/html; charset=utf-8','cache-control':'no-store',
        'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
        'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"
      });
      return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Noogle — Public Search Staging</title>
<style>:root{font-family:system-ui,sans-serif;color:#eaf7ee;background:#0d261b}*{box-sizing:border-box}body{margin:0}main{max-width:850px;margin:auto;padding:clamp(18px,4vw,52px)}header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:40px}.brand{font-weight:800;font-size:1.5rem}a{color:#a5e5bd}h1{font-size:clamp(2rem,6vw,3rem);margin:0 0 10px}p{line-height:1.5}.sub{color:#c4d4ca}.panel{padding:clamp(20px,4vw,34px);background:#143628;border:1px solid #4a7359;border-radius:16px}form{display:flex;gap:10px;margin:24px 0}input{min-width:0;flex:1;padding:15px;border-radius:9px;border:1px solid #80ad90;background:#0d261b;color:white;font:inherit}button{padding:12px 20px;border:0;border-radius:9px;background:#a5e5bd;color:#0b2117;font:inherit;font-weight:700;cursor:pointer}:focus-visible{outline:3px solid white;outline-offset:2px}ul{padding:0;list-style:none}li{border-top:1px solid #466854;padding:13px 0}li p{color:#bdcec2;margin:5px 0}.notice{margin-top:22px;color:#c7d8ca;font-size:.92rem}@media(max-width:520px){form{flex-direction:column}button{width:100%}}</style></head>
<body><main><header><span class="brand">NOOGLE <small>Connect staging</small></span><a href="https://noogle.holytemples.org/" rel="noopener noreferrer">Production Noogle ↗</a></header><section class="panel"><h1>Explore public knowledge</h1><p class="sub">A curated preview of public NEO and Temple links, not a live production index.</p><form id="search-form" role="search"><input id="query" type="search" aria-label="Search public resources" maxlength="100" placeholder="Search ministry, temple, code…" autocomplete="off"><button type="submit">Search</button></form><p id="status" role="status" aria-live="polite">Loading resources…</p><ul id="results"></ul></section><p class="notice">Preview only. Production NEO Pass, signing, enrollment and remote terminal are disabled.</p></main>
<script>
const form=document.getElementById('search-form'),input=document.getElementById('query'),status=document.getElementById('status'),list=document.getElementById('results');
async function search(query){
 status.textContent='Searching…';list.replaceChildren();
 try{
 const response=await fetch('/search?q='+encodeURIComponent(query),{cache:'no-store'});if(!response.ok)throw Error('Search unavailable');
 const data=await response.json();status.textContent=data.count+' public resource(s) found';
 for(const item of data.results){const li=document.createElement('li'),a=document.createElement('a'),p=document.createElement('p');a.href=item.url;a.textContent=item.title;a.target='_blank';a.rel='noopener noreferrer';p.textContent=item.tags;li.append(a,p);list.append(li);}
 }catch{status.textContent='Public search is temporarily unavailable.';}
}
form.addEventListener('submit',event=>{event.preventDefault();search(input.value.trim());});search('');
</script></body></html>`);
    }
    if(pathname === '/connect' || pathname.startsWith('/connect/') || pathname.startsWith('/api/'))
      return json(res,403,{error:'staging_capability_disabled',authentication:'not_configured',device_enrollment:false,document_signing:false,remote_terminal:false});
    return json(res,404,{error:'not_found'});
  });
}

if(import.meta.url === `file://${process.argv[1]}`) {
  createStagingServer().listen(port,'0.0.0.0',()=>console.log('Noogle Connect staging listening'));
}
