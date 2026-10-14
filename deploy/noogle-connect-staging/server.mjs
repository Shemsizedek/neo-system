import http from 'node:http';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 8080);
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#134a33"><title>Noogle Connect — Read-only Preview</title>
<style>body{background:#0e241c;color:#f0f8f3;font:16px system-ui;margin:0;padding:2rem}main{max-width:720px;margin:auto}h1{color:#98e3b0}.panel{border:1px solid #497763;border-radius:12px;padding:1.5rem;background:#173729}a{color:#b6f0ca}</style></head>
<body><main><h1>Noogle Connect</h1><div class="panel"><h2>Google Cloud Run private staging</h2>
<p>This is a read-only preview. Passkey enrollment, identity sessions, biometric signatures and Chromebook terminal access are not enabled.</p>
<p>NEO Guardian security operations require a separate certified authentication release.</p></div></main></body></html>`;
function send(res,status,data,kind='application/json; charset=utf-8',head=false){
 const body=Buffer.from(data);
 res.writeHead(status,{'Content-Type':kind,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",'Content-Length':body.length});
 res.end(head?undefined:body);
}
export function handler(req,res){
 const method=req.method||'GET';const head=method==='HEAD';
 if(method!=='GET'&&!head)return send(res,405,JSON.stringify({error:'method_not_allowed'}));
 let path;try{path=new URL(req.url||'/', 'http://localhost').pathname}catch{return send(res,400,JSON.stringify({error:'bad_request'}))}
 if(path==='/healthz')return send(res,200,JSON.stringify({ok:true,service:'noogle-connect-staging',mode:'read-only'}),'application/json; charset=utf-8',head);
 if(path==='/api/guardian/capabilities')return send(res,200,JSON.stringify({webauthn:'not_enabled',device_enrollment:'not_enabled',identity_session:'not_verified',remote_terminal:'disabled'}),'application/json; charset=utf-8',head);
 if(path.startsWith('/api/'))return send(res,403,JSON.stringify({error:'disabled'}),'application/json; charset=utf-8',head);
 if(path==='/'||path==='/index.html')return send(res,200,page,'text/html; charset=utf-8',head);
 return send(res,404,JSON.stringify({error:'not_found'}),'application/json; charset=utf-8',head);
}
if(process.argv[1]===fileURLToPath(import.meta.url))http.createServer(handler).listen(PORT,'0.0.0.0');
