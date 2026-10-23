import http from 'node:http'
import {normalizeResource,reconcileEstate,capacityPlacement} from './fabric.mjs'

const PORT=Number(process.env.PORT||8806),TOKEN=String(process.env.NEO_AUTOPILOT_OPERATOR_TOKEN||'')
const resources=new Map()
const windows=[]
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}
export function createAutopilotServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-infrastructure-autopilot',resources:resources.size})
 if(req.method==='GET'&&url.pathname==='/v1/estate/autopilot')return json(res,200,reconcileEstate({resources:[...resources.values()],maintenanceWindows:windows}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&url.pathname==='/v1/resources'){const r=normalizeResource(await body(req));resources.set(`${r.fabric}:${r.resource_id}`,r);return json(res,201,r)}
 if(req.method==='POST'&&url.pathname==='/v1/maintenance-windows'){const i=await body(req);windows.push({start:i.start,end:i.end,name:i.name||'maintenance'});return json(res,201,windows.at(-1))}
 if(req.method==='POST'&&url.pathname==='/v1/reconcile'){const i=await body(req);return json(res,200,reconcileEstate({resources:[...resources.values()],maintenanceWindows:windows,approved:i.approved===true}))}
 if(req.method==='POST'&&url.pathname==='/v1/place'){const i=await body(req);return json(res,200,capacityPlacement(i))}
 return json(res,404,{error:'not_found'})
}catch(error){return json(res,500,{error:'neo_autopilot_error',detail:String(error?.message||error)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createAutopilotServer().listen(PORT,'0.0.0.0')
