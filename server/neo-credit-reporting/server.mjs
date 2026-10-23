import http from 'node:http'
import {registerFurnisher,buildMetro2Record,createReportingBatch,suppressTradeline,correctTradeline,authorizeTransmission,recordDelivery,createDisputeIntake,createReportingAudit,reportingSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8822),TOKEN=String(process.env.NEO_CREDIT_REPORTING_OPERATOR_TOKEN||'')
const furnishers=[],batches=[],disputes=[],audit=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
function ev(type,id,data){const e=createReportingAudit({event_type:type,entity_id:id,data,previous_digest:audit.at(-1)?.digest||null});audit.push(e)}
export function createCreditReportingServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-credit-reporting'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/credit-reporting')return json(res,200,reportingSnapshot({furnishers,batches,disputes,audit}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/furnishers'){const f=registerFurnisher(await body(req));furnishers.push(f);ev('FURNISHER_REGISTERED',f.furnisher_id,f);return json(res,201,f)}
 if(req.method==='POST'&&u.pathname==='/v1/batches'){const i=await body(req),f=furnishers.find(x=>x.furnisher_id===i.furnisher_id);if(!f)return json(res,404,{error:'furnisher_not_found'});const b=createReportingBatch({batch_id:i.batch_id,furnisher:f,records:(i.tradelines||[]).map(buildMetro2Record),cycle_date:i.cycle_date});batches.push(b);return json(res,201,b)}
 const sup=u.pathname.match(/^\/v1\/batches\/([^/]+)\/suppress$/);if(req.method==='POST'&&sup){const b=batches.find(x=>x.batch_id===decodeURIComponent(sup[1]));Object.assign(b,suppressTradeline(b,await body(req)));return json(res,200,b)}
 const cor=u.pathname.match(/^\/v1\/batches\/([^/]+)\/correct$/);if(req.method==='POST'&&cor){const b=batches.find(x=>x.batch_id===decodeURIComponent(cor[1]));Object.assign(b,correctTradeline(b,await body(req)));return json(res,200,b)}
 const au=u.pathname.match(/^\/v1\/batches\/([^/]+)\/authorize$/);if(req.method==='POST'&&au){const b=batches.find(x=>x.batch_id===decodeURIComponent(au[1])),f=furnishers.find(x=>x.furnisher_id===b?.furnisher_id);Object.assign(b,authorizeTransmission(b,{furnisher:f,approved:true}));ev('BATCH_AUTHORIZATION_EVALUATED',b.batch_id,b);return json(res,200,b)}
 const dl=u.pathname.match(/^\/v1\/batches\/([^/]+)\/delivery$/);if(req.method==='POST'&&dl){const b=batches.find(x=>x.batch_id===decodeURIComponent(dl[1]));Object.assign(b,recordDelivery(b,await body(req)));ev('DELIVERY_RECORDED',b.batch_id,b);return json(res,200,b)}
 if(req.method==='POST'&&u.pathname==='/v1/disputes'){const d=createDisputeIntake(await body(req));disputes.push(d);return json(res,201,d)}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_credit_reporting_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createCreditReportingServer().listen(PORT,'0.0.0.0')
