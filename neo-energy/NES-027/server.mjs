// NES-027 local-only staging HTTP server. Synthetic data, no production deploy.
import http from 'node:http';
import {verifyEnergySession} from '../NES-023/verify-session.mjs';
import pg from 'pg';

export function createHandler({pool,secret,issuer='neo-pass',audience='neo-energy',clock}){
 if(!pool || !secret) throw new Error('staging_dependencies_required');
 return async(req,res)=>{
  const respond=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  if(req.method!=='GET')return respond(405,{error:'read_only'});
  let path;
  try{path=new URL(req.url,'http://localhost').pathname;}catch{return respond(400,{error:'bad_path'});}
  const m=/^\/v1\/energy\/tenants\/([A-Za-z0-9_-]{1,64})\/sites\/([A-Za-z0-9_-]{1,64})\/overview$/.exec(path);
  if(!m)return respond(404,{error:'not_found'});
  const auth=req.headers.authorization||'';
  const token=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(auth)?.[1];
  if(!token)return respond(401,{error:'unauthenticated'});
  let principal;
  try{principal=verifyEnergySession(token,{secret,issuer,audience,
    nowSeconds:clock?clock():Math.floor(Date.now()/1000)}).subject;}
  catch{return respond(401,{error:'unauthenticated'});}
  try{
   // Function enforces grant for verified subject. Never accept subject from HTTP.
   const data=await pool.query(
     'SELECT import_kwh::text, export_kwh::text FROM nes027.read_usage($1,$2,$3)',
     [principal,m[1],m[2]]);
   if(data.rows.length!==1)return respond(403,{error:'access_denied'});
   return respond(200,{mode:'SIMULATION_ONLY',tenant:m[1],site:m[2],
     import_kwh:data.rows[0].import_kwh,export_kwh:data.rows[0].export_kwh,
     payment_due:false,field_control_authorized:false});
  }catch{return respond(503,{error:'staging_unavailable'});}
 };
}
export function createLocalServer(opts){
 return http.createServer(createHandler(opts));
}
// No auto-start to prevent accidental public exposure.
export {pg};
