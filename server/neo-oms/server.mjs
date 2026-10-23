import http from 'node:http'
import {createParentOrder,evaluatePreTradeRisk,approveParentOrder,buildExecutionPlan,routeChildOrder,recordFill,aggregateParent,allocateFills,createAuditEvent,omsSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8815),TOKEN=String(process.env.NEO_OMS_OPERATOR_TOKEN||'')
const parents=[],children=[],fills=[],allocations=[],audit=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
function appendAudit(event_type,entity_id,actor_id,data){const previous_digest=audit.at(-1)?.digest||null;const e=createAuditEvent({event_type,entity_id,actor_id,data,previous_digest});audit.push(e);return e}
export function createOmsServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-oms',parents:parents.length})
 if(req.method==='GET'&&u.pathname==='/v1/estate/oms')return json(res,200,omsSnapshot({parents,children,fills,allocations,audit}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/orders'){const i=await body(req),o=createParentOrder(i);parents.push(o);appendAudit('ORDER_CREATED',o.order_id,i.actor_id,o);return json(res,201,o)}
 const risk=u.pathname.match(/^\/v1\/orders\/([^/]+)\/risk$/);if(req.method==='POST'&&risk){const o=parents.find(x=>x.order_id===decodeURIComponent(risk[1]));if(!o)return json(res,404,{error:'order_not_found'});const i=await body(req),r=evaluatePreTradeRisk(o,i.limits||{});Object.assign(o,approveParentOrder(o,{risk:r,approved:i.approved===true}));appendAudit('RISK_EVALUATED',o.order_id,i.actor_id,r);if(o.state==='APPROVED')appendAudit('ORDER_APPROVED',o.order_id,i.actor_id,{});return json(res,200,o)}
 const plan=u.pathname.match(/^\/v1\/orders\/([^/]+)\/plan$/);if(req.method==='POST'&&plan){const o=parents.find(x=>x.order_id===decodeURIComponent(plan[1]));const p=buildExecutionPlan(o,await body(req));children.push(...p.children);Object.assign(o,{state:'WORKING'});for(const c of p.children)appendAudit('CHILD_CREATED',c.child_order_id,null,c);return json(res,201,p)}
 const route=u.pathname.match(/^\/v1\/children\/([^/]+)\/route$/);if(req.method==='POST'&&route){const c=children.find(x=>x.child_order_id===decodeURIComponent(route[1]));const i=await body(req);Object.assign(c,routeChildOrder(c,{routerDecision:i.router_decision}));appendAudit('ROUTED',c.child_order_id,i.actor_id,c);return json(res,200,c)}
 const fill=u.pathname.match(/^\/v1\/children\/([^/]+)\/fills$/);if(req.method==='POST'&&fill){const c=children.find(x=>x.child_order_id===decodeURIComponent(fill[1]));const i=await body(req);Object.assign(c,recordFill(c,i));fills.push({child_order_id:c.child_order_id,...i});const p=parents.find(x=>x.order_id===c.parent_order_id);Object.assign(p,aggregateParent(p,children.filter(x=>x.parent_order_id===p.order_id)));appendAudit('FILL_RECORDED',c.child_order_id,i.actor_id,i);return json(res,200,{child:c,parent:p})}
 const alloc=u.pathname.match(/^\/v1\/orders\/([^/]+)\/allocate$/);if(req.method==='POST'&&alloc){const p=parents.find(x=>x.order_id===decodeURIComponent(alloc[1]));const a=allocateFills(p,await body(req));allocations.push(a);Object.assign(p,{state:'ALLOCATED'});appendAudit('ALLOCATED',p.order_id,null,a);return json(res,201,a)}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_oms_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createOmsServer().listen(PORT,'0.0.0.0')
