import http from 'node:http';
import {
  MemoryEnterpriseStore, createOrganization, createWorkspace, setWorkspaceVisibility,
  inviteMember, assignRole, mapBusinessWallet, createBooksCompany,
  createMerchantLocation, organizationWorkspaceSnapshot
} from './workspaces.mjs';

const port=Number(process.env.NEO_ENTERPRISE_PORT||8788);
const trustProxy=process.env.NEO_ENTERPRISE_TRUST_PROXY==='1';
const allowedOrigins=(process.env.NEO_ENTERPRISE_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
const store=new MemoryEnterpriseStore();

function json(res,status,body,origin){
  const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
  if(origin&&allowedOrigins.includes(origin)){
    headers['access-control-allow-origin']=origin;
    headers['access-control-allow-headers']='content-type,x-neo-principal-id';
    headers['access-control-allow-methods']='GET,POST,PATCH,OPTIONS';
    headers.vary='Origin';
  }
  res.writeHead(status,headers); res.end(JSON.stringify(body));
}
function principal(req){
  if(!trustProxy) return null;
  const v=req.headers['x-neo-principal-id'];
  return typeof v==='string'&&v.trim()?v.trim():null;
}
async function body(req){
  const chunks=[]; for await(const c of req) chunks.push(c);
  if(!chunks.length) return {};
  if(Buffer.concat(chunks).length>262144) throw Object.assign(new Error('payload_too_large'),{statusCode:413});
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function route(pathname){ return pathname.split('/').filter(Boolean); }

const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(req.method==='OPTIONS') return json(res,204,{},origin);
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/health') return json(res,200,{ok:true,service:'neo-enterprise-control-plane',trust_proxy:trustProxy},origin);
    const principalId=principal(req);
    if(!principalId) return json(res,401,{error:'authenticated_principal_required'},origin);
    const p=route(url.pathname);

    if(req.method==='POST'&&url.pathname==='/v1/organizations'){
      return json(res,201,{organization:await createOrganization({store,principalId,input:await body(req)})},origin);
    }
    if(p[0]==='v1'&&p[1]==='organizations'&&p[2]){
      const organizationId=p[2];
      if(req.method==='GET'&&p.length===3){
        return json(res,200,await organizationWorkspaceSnapshot({store,principalId,organizationId}),origin);
      }
      if(req.method==='POST'&&p[3]==='workspaces'){
        return json(res,201,{workspace:await createWorkspace({store,principalId,organizationId,input:await body(req)})},origin);
      }
      if(req.method==='PATCH'&&p[3]==='workspaces'&&p[4]&&p[5]==='visibility'){
        const input=await body(req);
        return json(res,200,{workspace:await setWorkspaceVisibility({store,principalId,organizationId,workspaceId:p[4],visibility:input.visibility})},origin);
      }
      if(req.method==='POST'&&p[3]==='members'){
        return json(res,201,{member:await inviteMember({store,principalId,organizationId,input:await body(req)})},origin);
      }
      if(req.method==='PATCH'&&p[3]==='members'&&p[4]&&p[5]==='role'){
        const input=await body(req);
        return json(res,200,{member:await assignRole({store,principalId,organizationId,memberId:p[4],role:input.role})},origin);
      }
      if(req.method==='POST'&&p[3]==='wallets'){
        return json(res,201,{wallet:await mapBusinessWallet({store,principalId,organizationId,input:await body(req)})},origin);
      }
      if(req.method==='POST'&&p[3]==='books'){
        return json(res,201,{books:await createBooksCompany({store,principalId,organizationId,input:await body(req)})},origin);
      }
      if(req.method==='POST'&&p[3]==='merchant-locations'){
        return json(res,201,{merchant_location:await createMerchantLocation({store,principalId,organizationId,input:await body(req)})},origin);
      }
    }
    return json(res,404,{error:'not_found'},origin);
  }catch(error){
    return json(res,error.statusCode||400,{error:error.message||'request_failed'},origin);
  }
});

server.listen(port,()=>console.log(`NEO Enterprise control plane listening on :${port}`));
