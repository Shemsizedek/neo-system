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
        'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"
      });
      return res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Noogle Connect — Staging</title><style>body{background:#0e241a;color:#f1f5f2;font:16px system-ui;max-width:680px;margin:12vh auto;padding:22px;line-height:1.6}a{color:#90dfae}.panel{border:1px solid #6a9275;border-radius:14px;padding:24px}</style><main class="panel"><h1>Noogle Connect</h1><p>Temporary Render development preview — read-only.</p><p>Production NEO Pass credentials and device-control functions are not available here. No signing, enrollment, voting, or terminal access is enabled.</p><p><a href="${searchHome}">Return to the existing Noogle search service</a></p></main></html>`);
    }
    if(pathname === '/connect' || pathname.startsWith('/connect/') || pathname.startsWith('/api/'))
      return json(res,403,{error:'staging_capability_disabled',authentication:'not_configured',device_enrollment:false,document_signing:false,remote_terminal:false});
    return json(res,404,{error:'not_found'});
  });
}

if(import.meta.url === `file://${process.argv[1]}`) {
  createStagingServer().listen(port,'0.0.0.0',()=>console.log('Noogle Connect staging listening'));
}
