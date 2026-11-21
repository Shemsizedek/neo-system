/**
 * NEO-FLIP-012 synthetic-only staging activator.
 * The ONLY public route is GET /healthz. No buyer, listing, preview, audit,
 * contract, payment or token routes are mounted on this public server.
 * Restricted Neon smoke test runs privately through a temporary loopback server.
 */
import {createServer} from 'node:http';
import {runScratchSmoke} from './gate11-http-pg-smoke.mjs';
import {assertScratchDatabaseUrl} from './gate11-config.mjs';

export const STAGING_MODE='synthetic_scratch_only';

export function createGate12HealthHandler(readiness){
 if(typeof readiness!=='function')throw new TypeError('readiness_callback_required');
 return (req,res)=>{
  const good=req.method==='GET'&&req.url==='/healthz';
  const ready=good&&readiness()===true;
  res.writeHead(good?(ready?200:503):404,{
   'content-type':'application/json; charset=utf-8',
   'cache-control':'no-store',
   'x-content-type-options':'nosniff',
   'referrer-policy':'no-referrer',
   'content-security-policy':"default-src 'none'",
   'access-control-allow-origin':'null',
  });
  res.end(JSON.stringify(good
   ?{service:'neo-flipper-staging',status:ready?'ready':'blocked',mode:STAGING_MODE}
   :{error:'not_found'}));
 };
}

export async function activateGate12({
 connectionString,loadPool,runSmoke=runScratchSmoke,
 httpServerFactory=createServer,port=Number(process.env.PORT||10000),
 host='0.0.0.0'
}={}){
 let ready=false,server,details=null;
 const listenPort=Number(port);
 if(!Number.isInteger(listenPort)||listenPort<0||listenPort>65535)throw new Error('invalid_bind_port');
 // Validate before any connection attempt; never display connection credentials.
 try{
  assertScratchDatabaseUrl(connectionString);
  if(process.env.NEO_FLIPPER_GATE11_RUN!=='scratch-only')throw new Error('scratch_activation_flag_required');
  const result=await runSmoke({connectionString,loadPool});
  ready=result?.passed===true&&result?.mode==='scratch_only'&&
   result?.recognizedRevenueUsd===0&&
   Array.isArray(result.checks)&&result.checks.includes('pg_persistence');
  details=ready?{passed:true,checks:result.checks.length}:null;
 }catch(_error){ready=false;details=null}
 server=httpServerFactory(createGate12HealthHandler(()=>ready));
 server.listen(listenPort,host);
 return {server,readiness:()=>ready,diagnostics:()=>details,publicRoutes:['GET /healthz']};
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 // pg must be installed in the isolated Render build environment. No runtime
 // installation or dynamic downloads and no production app is imported.
 const conn=process.env.NEO_FLIPPER_SCRATCH_DATABASE_URL;
 let loadPool=async()=>{throw new Error('pg_driver_missing')};
 try{
  const pg=await import('pg');
  const {Pool}=(pg.default||pg);
  loadPool=async url=>new Pool({
   connectionString:url,ssl:{rejectUnauthorized:true},max:2,
   connectionTimeoutMillis:7000,query_timeout:10000,
   idleTimeoutMillis:3000,allowExitOnIdle:true
  });
 }catch{}
 const active=await activateGate12({connectionString:conn,loadPool});
 active.server.on('error',()=>{process.exitCode=1});
 process.stdout.write(active.readiness()
   ?'NEO Flipper staging synthetic health: READY\n'
   :'NEO Flipper staging synthetic health: BLOCKED\n');
}
