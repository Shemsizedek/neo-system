import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createBankSourceClient} from '../../server/neo-bank/source-client.mjs';
import {createBankSourceHandler} from '../../server/neo-bank/source-api.mjs';

// Non-transactional preview. Source access is an authenticated backend concern.
const headers={
  'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer'
};
const htmlHeaders={...headers,'content-type':'text/html; charset=utf-8',
  'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"};
const page=[
'<!doctype html><html lang="en"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1"><title>NEO Bank | Read-only staging</title>',
'<style>body{background:#08150f;color:#f2f4e9;font:16px system-ui,sans-serif;margin:0;line-height:1.65}',
'main{max-width:750px;margin:8vh auto;padding:2rem}h1{font-size:clamp(2rem,7vw,4rem);line-height:1.15;margin:.2em 0}',
'small,.muted{color:#b3c8bd}.label{letter-spacing:.1em;text-transform:uppercase;color:#e5c278}',
'article{border:1px solid #3c594a;border-radius:14px;padding:1.4rem;margin-top:1.3rem}',
'a{color:#f6d78c}strong{color:white}.warning{color:#ffcf83}</style></head>',
'<body><main><p class="label">NEO System · Project 144</p><h1>NEO Bank</h1>',
'<p class="warning"><strong>Read-only staging preview.</strong> Account services are awaiting verification.</p>',
'<p>NEO Bank is being prepared with private data connections managed on the backend. Account access and data availability are still being verified.</p>',
'<article><h2>Service status</h2><p>Account registration, transfers, credits, and issuance are <strong>disabled</strong> in this preview.</p>',
'<p><a href="/healthz">Preview availability</a> · <a href="/api/v1/community/status">Account service status</a></p></article>',
'<p class="muted"><small>For application verification only. No customer financial data is held in this preview.</small></p></main></body></html>'
].join('');
function send(res,status,data,type=headers){res.writeHead(status,type);res.end(typeof data==='string'?data:JSON.stringify(data))}
export function createNeoBankStagingServer({sourceClient=createBankSourceClient(),sourceControlToken=process.env.NEO_BANK_SOURCE_CONTROL_TOKEN}={}){
  const sourceHandler=createBankSourceHandler({client:sourceClient,token:sourceControlToken});
  return http.createServer(async(req,res)=>{
    if(await sourceHandler(req,res))return;
    const path=new URL(req.url||'/', 'http://localhost').pathname;
    if(req.method!=='GET')return send(res,503,{ok:false,error:'staging_writes_disabled',mode:'read-only-preview'});
    if(path==='/healthz')return send(res,200,{ok:true,service:'neo-bank-render-staging',mode:'read-only-preview',bankOperational:false});
    if(path==='/health')return send(res,503,{ok:false,service:'neo-bank',reason:'bank_backend_not_deployed'});
    if(path==='/api/v1/community/status')return send(res,503,{ok:false,service:'NEO Bank',database:'not_attached',accountServices:false,mode:'read-only-preview'});
    if(path==='/api/v1/auth/config')return send(res,200,{enabled:false,mode:'read-only-preview'});
    if(path==='/'||path==='/index.html')return send(res,200,page,htmlHeaders);
    return send(res,404,{ok:false,error:'not_found'});
  });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const port=Number(process.env.PORT||10000);
  createNeoBankStagingServer().listen(port,'0.0.0.0',()=>console.log('NEO Bank read-only staging preview listening on configured port'));
}
