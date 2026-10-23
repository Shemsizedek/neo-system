import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base=new URL('../../docs/connect/',import.meta.url);
const port=Number(process.env.PORT||8080);
const routes=new Map([['/','index.html'],['/index.html','index.html'],['/manifest.webmanifest','manifest.webmanifest'],['/passkeys.js','passkeys.js']]);
const mime={'index.html':'text/html; charset=utf-8','manifest.webmanifest':'application/manifest+json','passkeys.js':'application/javascript; charset=utf-8'};
export function handler(req,res){
 const send=(status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",'Strict-Transport-Security':'max-age=31536000','Content-Length':Buffer.byteLength(body)});res.end(body)};
 if(req.method!=='GET'&&req.method!=='HEAD')return send(405,JSON.stringify({error:'method_not_allowed'}));
 const path=new URL(req.url||'/', 'http://localhost').pathname;
 if(path==='/healthz')return send(200,JSON.stringify({ok:true,service:'noogle-connect-staging',mode:'read-only'}));
 if(path==='/api/guardian/capabilities')return send(200,JSON.stringify({service:'neo-guardian',webauthn:'not_enabled',device_enrollment:'not_enabled',identity_session:'not_verified',remote_terminal:'disabled'}));
 if(path==='/api/guardian/health')return send(200,JSON.stringify({service:'neo-guardian',status:'ok',mode:'preproduction'}));
 if(path.startsWith('/api/'))return send(403,JSON.stringify({error:'disabled'}));
 const filename=routes.get(path);
 if(!filename)return send(404,JSON.stringify({error:'not_found'}));
 readFile(new URL(filename,base)).then(data=>{const headers={'Content-Type':mime[filename],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",'Content-Length':data.length};res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:data)}).catch(()=>send(503,JSON.stringify({error:'asset_unavailable'})));
}
if(process.argv[1]===fileURLToPath(import.meta.url))http.createServer(handler).listen(port,'0.0.0.0');
