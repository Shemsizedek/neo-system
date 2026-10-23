import http from 'node:http'
import {registerVenue,normalizeBook,createRfq,chooseBestRoute,createExecutionIntent,reconcileExecution,routerSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8814),TOKEN=String(process.env.NEO_MARKET_ROUTER_OPERATOR_TOKEN||'')
const venues=[],books=[],rfqs=[],executions=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
export function createMarketRouterServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-market-router',venues:venues.length})
 if(req.method==='GET'&&u.pathname==='/v1/estate/router')return json(res,200,routerSnapshot({venues,books,rfqs,executions}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/venues'){const v=registerVenue(await body(req));venues.push(v);return json(res,201,v)}
 if(req.method==='POST'&&u.pathname==='/v1/books'){const b=normalizeBook(await body(req));books.push(b);return json(res,201,b)}
 if(req.method==='POST'&&u.pathname==='/v1/rfqs'){const r=createRfq(await body(req));rfqs.push(r);return json(res,201,r)}
 if(req.method==='POST'&&u.pathname==='/v1/route'){const request=await body(req),route=chooseBestRoute({venues,books,rfqs,request});return json(res,200,route)}
 if(req.method==='POST'&&u.pathname==='/v1/executions'){const request=await body(req),route=chooseBestRoute({venues,books,rfqs,request}),i=createExecutionIntent({route,request});executions.push(i);return json(res,201,i)}
 const ex=u.pathname.match(/^\/v1\/executions\/([^/]+)\/reconcile$/);if(req.method==='POST'&&ex){const i=executions.find(x=>x.execution_id===decodeURIComponent(ex[1]));if(!i)return json(res,404,{error:'execution_not_found'});Object.assign(i,reconcileExecution(i,await body(req)));return json(res,200,i)}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_market_router_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createMarketRouterServer().listen(PORT,'0.0.0.0')
