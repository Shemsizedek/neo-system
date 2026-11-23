import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleNeoExchangeRequest } from '../../api/neo-exchange/server.mjs';
import { createTickerService } from '../markets/ticker-service.mjs';

const ROOT=fileURLToPath(new URL('../../apps/neo-exchange/dist/',import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};
const tickerService=createTickerService();
const blockedPrefix='/api/integrations/';
function json(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));}
export async function handleNeoFxRequest(req,res,{root=ROOT,tickers=tickerService}={}){
 const url=new URL(req.url||'/', 'https://neofx.holytemples.org');
 const pathname=url.pathname;
 if(pathname.startsWith(blockedPrefix) || pathname==='/api/auth/session' || pathname.startsWith('/api/account/')){
   return json(res,503,{code:'PRIVATE_AUTH_NOT_DEPLOYED',message:'NEO Pass and Alpaca OAuth consent are not yet enabled',execution:false});
 }
 if(req.method==='GET'&&pathname==='/health'){
   return json(res,200,{ok:true,service:'neofx-dedicated',surface:'react',authorization:'disabled',execution:false});
 }
 if(pathname==='/api/markets/tickers'){
   if(req.method!=='GET')return json(res,405,{error:'read_only_endpoint'});
   const market=url.searchParams.get('market')||'fx';
   if(!['fx','dex','all'].includes(market))return json(res,400,{error:'invalid_market'});
   try{return json(res,200,await tickers.tickers({market}));}catch{return json(res,502,{error:'ticker_upstream_unavailable'});}
 }
 if(pathname.startsWith('/api/neo-exchange/')){
   if(req.method!=='GET')return json(res,405,{code:'ORDER_EXECUTION_DISABLED'});
   return handleNeoExchangeRequest(req,res);
 }
 if(pathname.startsWith('/api/'))return json(res,404,{error:'not_found'});
 if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'method_not_allowed'});
 // Do not serve arbitrary dot files or traverse outside the packaged React dist.
 let decoded;
 try{decoded=decodeURIComponent(pathname);}catch{return json(res,400,{error:'invalid_path'});}
 if(decoded.split('/').some(segment=>segment==='..'||segment.startsWith('.')))return json(res,400,{error:'invalid_path'});
 const asset=decoded==='/'||decoded==='/account'||decoded==='/ui'?'index.html':decoded.replace(/^\//,'');
 let target=resolve(root,asset),base=resolve(root);
 if(target!==base && !target.startsWith(base+sep))return json(res,400,{error:'invalid_path'});
 try{
  let info=await stat(target);
  if(!info.isFile())return json(res,404,{error:'not_found'});
  const body=await readFile(target);
  res.writeHead(200,{'content-type':MIME[extname(target)]||'application/octet-stream','cache-control':extname(target)==='.html'?'no-store':'public, max-age=300','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none' "});
  return res.end(req.method==='HEAD'?undefined:body);
 }catch(error){return json(res,error?.code==='ENOENT'?404:500,{error:error?.code==='ENOENT'?'not_found':'asset_error'});}
}
export function createNeoFxServer(deps){return http.createServer((req,res)=>{Promise.resolve(handleNeoFxRequest(req,res,deps)).catch(()=>{if(!res.headersSent)json(res,500,{error:'internal_error'});else res.end();});});}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))createNeoFxServer().listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('NEO FX dedicated read-only service listening'));
