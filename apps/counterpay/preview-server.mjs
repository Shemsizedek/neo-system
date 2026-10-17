// COUNTERPAY-013: loopback-only preview server.
// NOT a NEO Pass authentication service or public deployment.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const files=new Map([['/','index.html'],['/index.html','index.html'],
 ['/wallet-engine.mjs','wallet-engine.mjs'],['/transaction-planner.mjs','transaction-planner.mjs'],
 ['/market-bridge.mjs','market-bridge.mjs'],['/bitcoin-readonly.mjs','bitcoin-readonly.mjs'],
 ['/bitcoin-funding.mjs','bitcoin-funding.mjs']]);
export function createPreviewServer(){
 return http.createServer(async(req,res)=>{
  const url=new URL(req.url||'/', 'http://localhost');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src https:; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  if(req.method!=='GET'){res.writeHead(405);res.end('Method not allowed');return}
  if(url.pathname==='/api/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'preview-only',auth:'unavailable',signing:false,broadcast:false}));return}
  if(url.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Authentication and transaction APIs are not deployed'}));return}
  const filename=files.get(url.pathname);
  if(!filename){res.writeHead(404);res.end('Not found');return}
  try{const body=await readFile(path.join(root,filename));res.writeHead(200,{'Content-Type':filename.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});res.end(body)}
  catch{res.writeHead(500);res.end('Preview asset unavailable')}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const host='127.0.0.1';const port=Number(process.env.PORT||8080);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 createPreviewServer().listen(port,host,()=>console.log('CounterPay loopback preview: http://'+host+':'+port));
}
