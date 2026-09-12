import http from 'node:http';
import { createNeoEdgeServer } from './server.mjs';
import { isWirePlatformPath, proxyWirePlatform, serveWireApp, wireServiceManifest } from './wire-app.mjs';

const PORT=Number(process.env.PORT||8080);
const LEGACY_HOST='127.0.0.1';

function hostOf(req){return String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().split(':')[0].toLowerCase()}
function json(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}

function proxyLegacy(req,res,port){
  const headers={...req.headers,host:req.headers.host||'neo.holytemples.org','x-forwarded-host':req.headers['x-forwarded-host']||req.headers.host||''};
  const upstream=http.request({host:LEGACY_HOST,port,path:req.url||'/',method:req.method,headers},reply=>{res.writeHead(reply.statusCode||502,reply.headers);reply.pipe(res)});
  upstream.on('error',error=>json(res,502,{error:'neo_edge_upstream_unavailable',detail:error.message}));
  req.pipe(upstream);
}

export async function startNeoEdgeProduction(){
  const legacy=createNeoEdgeServer();
  await new Promise((resolve,reject)=>{legacy.once('error',reject);legacy.listen(0,LEGACY_HOST,resolve)});
  const legacyPort=legacy.address().port;
  const front=http.createServer(async(req,res)=>{
    const host=hostOf(req);
    const url=new URL(req.url||'/',`https://${host||'neo.holytemples.org'}`);
    if(host!=='wire.holytemples.org')return proxyLegacy(req,res,legacyPort);
    try{
      if(req.method==='GET'&&url.pathname==='/api/wire/status')return json(res,200,wireServiceManifest());
      if(isWirePlatformPath(url.pathname))return await proxyWirePlatform(req,res,url);
      const served=serveWireApp(req,res,url);if(served!==false)return served;
      return proxyLegacy(req,res,legacyPort);
    }catch(error){return json(res,500,{error:'neo_wire_edge_error',detail:String(error?.message||error)})}
  });
  front.on('close',()=>legacy.close());
  front.listen(PORT,'0.0.0.0',()=>console.log(`NEO edge production router listening on 0.0.0.0:${PORT}; legacy edge on ${LEGACY_HOST}:${legacyPort}`));
  return{front,legacy};
}

if(import.meta.url===`file://${process.argv[1]}`)startNeoEdgeProduction().catch(error=>{console.error(error);process.exitCode=1});
