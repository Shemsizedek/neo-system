import http from 'node:http'
import {createNetworkRegistry,networkSnapshot,routeWithFailover} from './fabric.mjs'

const PORT=Number(process.env.PORT||8800)
const TOKEN=String(process.env.NEO_NETWORK_OPERATOR_TOKEN||'')
const registry=createNetworkRegistry()
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}

export function createNetworkServer(){
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||'/','http://neo.local')
   if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-network-fabric',nodes:registry.nodes().length})
   if(req.method==='GET'&&url.pathname==='/v1/estate/network')return json(res,200,networkSnapshot(registry))
   if(req.method==='POST'&&url.pathname==='/v1/nodes'){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    return json(res,201,{node:registry.enrollNode(await body(req))})
   }
   const hb=url.pathname.match(/^\/v1\/nodes\/([^/]+)\/heartbeat$/)
   if(req.method==='POST'&&hb){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    return json(res,200,{node:registry.heartbeat(decodeURIComponent(hb[1]),await body(req))})
   }
   if(req.method==='POST'&&url.pathname==='/v1/services'){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    return json(res,201,{service:registry.registerService(await body(req))})
   }
   const resolve=url.pathname.match(/^\/v1\/services\/([^/]+)\/resolve$/)
   if(req.method==='GET'&&resolve)return json(res,200,registry.resolveService(decodeURIComponent(resolve[1])))
   if(req.method==='POST'&&url.pathname==='/v1/routes/failover'){
    if(!auth(req))return json(res,401,{error:'operator_auth_required'})
    const input=await body(req);return json(res,200,routeWithFailover({serviceId:input.service_id,registry,failedNodeId:input.failed_node_id}))
   }
   return json(res,404,{error:'not_found'})
  }catch(error){return json(res,500,{error:'neo_network_error',detail:String(error?.message||error)})}
 })
}
if(import.meta.url===`file://${process.argv[1]}`)createNetworkServer().listen(PORT,'0.0.0.0')
