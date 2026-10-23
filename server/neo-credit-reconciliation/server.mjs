import http from 'node:http'
import {reconcileReportingCycle,resolveException,createQaAudit,reconciliationSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8823),TOKEN=String(process.env.NEO_CREDIT_RECONCILIATION_OPERATOR_TOKEN||'')
const cycles=[],exceptions=[],audit=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
function ev(type,cycle_id,data){const e=createQaAudit({event_type:type,cycle_id,data,previous_digest:audit.at(-1)?.digest||null});audit.push(e)}
export function createCreditReconciliationServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-credit-reconciliation'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/credit-reconciliation')return json(res,200,reconciliationSnapshot({cycles,exceptions,audit}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/cycles'){const c=reconcileReportingCycle(await body(req));cycles.push(c);exceptions.push(...c.exceptions);ev('CYCLE_RECONCILED',c.cycle_id,{reporting_allowed:c.reporting_allowed,material_open:c.material_open});return json(res,201,c)}
 const ex=u.pathname.match(/^\/v1\/exceptions\/([^/]+)\/resolve$/);if(req.method==='POST'&&ex){const e=exceptions.find(x=>x.exception_id===decodeURIComponent(ex[1]));if(!e)return json(res,404,{error:'exception_not_found'});Object.assign(e,resolveException(e,await body(req)));return json(res,200,e)}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_credit_reconciliation_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createCreditReconciliationServer().listen(PORT,'0.0.0.0')
