'use strict';
// NEO eFax HTTP boundary. This server cannot submit faxes or approve requests.
const http=require('node:http');
const crypto=require('node:crypto');
function reply(res,code,data){
 res.writeHead(code,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});
 res.end(JSON.stringify(data));
}
function createServer({token}={}){
 function allowed(auth){
  if(typeof token!=='string'||!token||typeof auth!=='string')return false;
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(auth).digest(),
   crypto.createHash('sha256').update('Bearer '+token).digest());
 }
 return http.createServer(async(req,res)=>{
  const path=req.url?.split('?')[0];
  if(path==='/health'&&req.method==='GET')
   return reply(res,200,{service:'neo-efax',status:'online',transport:'unconfigured',liveFaxEnabled:false});
  if(!allowed(req.headers.authorization))return reply(res,401,{error:'unauthorized'});
  if(path==='/v1/capabilities'&&req.method==='GET')
   return reply(res,200,{api:'v1',transport:'unconfigured',canSubmitFax:false,canTrackJobs:true,canApproveRequests:false});
  if(path==='/v1/faxes'&&req.method==='GET')return reply(res,200,{jobs:[]});
  if(path==='/v1/faxes'&&req.method==='POST')
   return reply(res,503,{error:'fax_transport_not_connected',message:'No fax submitted. Live transport requires separate authorization.'});
  if(path==='/v1/requests'&&req.method==='POST')
   return reply(res,503,{error:'authenticated_workflow_not_connected'});
  if(path==='/v1/approvals'&&req.method==='POST')
   return reply(res,503,{error:'authenticated_workflow_not_connected'});
  return reply(res,404,{error:'not_found'});
 });
}
if(require.main===module){
 const port=Number(process.env.PORT||10000);
 createServer({token:process.env.NEO_EFAX_API_TOKEN}).listen(port,'0.0.0.0');
}
module.exports={createServer};
