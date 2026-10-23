import http from 'node:http'
import {createServicingAccount,createPaymentRecord,allocatePayment,evaluateDelinquency,cureDelinquency,createCovenant,evaluateCovenant,createRestructuring,recordDefaultEvent,createRecoveryRecord,performanceSnapshot,createServicingEvidence,servicingSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8820),TOKEN=String(process.env.NEO_SERVICING_OPERATOR_TOKEN||'')
const accounts=[],payments=[],covenants=[],restructurings=[],defaults=[],recoveries=[],evidence=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
function ev(type,servicing_id,data){const e=createServicingEvidence({event_type:type,servicing_id,data,previous_digest:evidence.at(-1)?.digest||null});evidence.push(e)}
export function createServicingServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-servicing'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/servicing')return json(res,200,servicingSnapshot({accounts,payments,covenants,restructurings,defaults,recoveries,evidence}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/accounts'){const a=createServicingAccount(await body(req));accounts.push(a);ev('SERVICING_ACCOUNT_CREATED',a.servicing_id,a);return json(res,201,a)}
 if(req.method==='POST'&&u.pathname==='/v1/payments'){const p=createPaymentRecord(await body(req));payments.push(p);return json(res,201,p)}
 const post=u.pathname.match(/^\/v1\/payments\/([^/]+)\/post$/);if(req.method==='POST'&&post){const p=payments.find(x=>x.payment_id===decodeURIComponent(post[1]));const a=accounts.find(x=>x.servicing_id===p?.servicing_id);if(!p||!a)return json(res,404,{error:'payment_or_account_not_found'});const x=allocatePayment(a,p,await body(req));Object.assign(a,x.account);Object.assign(p,x.payment);ev('PAYMENT_POSTED',a.servicing_id,p);return json(res,200,x)}
 const delin=u.pathname.match(/^\/v1\/accounts\/([^/]+)\/delinquency$/);if(req.method==='POST'&&delin){const a=accounts.find(x=>x.servicing_id===decodeURIComponent(delin[1]));Object.assign(a,evaluateDelinquency(a,await body(req)));return json(res,200,a)}
 const cure=u.pathname.match(/^\/v1\/accounts\/([^/]+)\/cure$/);if(req.method==='POST'&&cure){const a=accounts.find(x=>x.servicing_id===decodeURIComponent(cure[1]));Object.assign(a,cureDelinquency(a,await body(req)));ev('DELINQUENCY_CURED',a.servicing_id,a);return json(res,200,a)}
 if(req.method==='POST'&&u.pathname==='/v1/covenants'){const c=createCovenant(await body(req));covenants.push(c);return json(res,201,c)}
 const ce=u.pathname.match(/^\/v1\/covenants\/([^/]+)\/evaluate$/);if(req.method==='POST'&&ce){const c=covenants.find(x=>x.covenant_id===decodeURIComponent(ce[1]));Object.assign(c,evaluateCovenant(c,await body(req)));return json(res,200,c)}
 if(req.method==='POST'&&u.pathname==='/v1/restructurings'){const r=createRestructuring(await body(req));restructurings.push(r);return json(res,201,r)}
 if(req.method==='POST'&&u.pathname==='/v1/defaults'){const d=recordDefaultEvent(await body(req));defaults.push(d);return json(res,201,d)}
 if(req.method==='POST'&&u.pathname==='/v1/recoveries'){const r=createRecoveryRecord(await body(req));recoveries.push(r);return json(res,201,r)}
 const perf=u.pathname.match(/^\/v1\/accounts\/([^/]+)\/performance$/);if(req.method==='GET'&&perf){const a=accounts.find(x=>x.servicing_id===decodeURIComponent(perf[1]));if(!a)return json(res,404,{error:'servicing_account_not_found'});return json(res,200,performanceSnapshot(a,{payments:payments.filter(x=>x.servicing_id===a.servicing_id),defaults:defaults.filter(x=>x.servicing_id===a.servicing_id),restructurings:restructurings.filter(x=>x.servicing_id===a.servicing_id)}))}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_servicing_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createServicingServer().listen(PORT,'0.0.0.0')
