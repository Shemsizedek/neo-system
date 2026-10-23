import http from 'node:http'
import {createDrawRequest,reserveCredit,authorizeFunding,createFundingInstruction,recordFundingSignature,submitFunding,settleFunding,createAdvanceLedgerEntry,accrueInterest,createRepaymentSchedule,recordRepayment,evaluateCollateralRelease,createFundingEvidence,fundingSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8819),TOKEN=String(process.env.NEO_FUNDING_OPERATOR_TOKEN||'')
const draws=[],instructions=[],advances=[],repayments=[],evidence=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
function ev(type,draw_id,data){const e=createFundingEvidence({event_type:type,draw_id,data,previous_digest:evidence.at(-1)?.digest||null});evidence.push(e)}
export function createFundingServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-funding'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/funding')return json(res,200,fundingSnapshot({draws,instructions,advances,repayments,evidence}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/draws'){const i=await body(req);let d=createDrawRequest(i);d=reserveCredit(d,{approved_credit:i.approved_credit,existing_reserved:i.existing_reserved||0});draws.push(d);ev('DRAW_CREATED',d.draw_id,d);return json(res,201,d)}
 const au=u.pathname.match(/^\/v1\/draws\/([^/]+)\/authorize$/);if(req.method==='POST'&&au){const d=draws.find(x=>x.draw_id===decodeURIComponent(au[1]));Object.assign(d,authorizeFunding(d,await body(req)));ev('DRAW_AUTHORIZED',d.draw_id,d);return json(res,200,d)}
 if(req.method==='POST'&&u.pathname==='/v1/instructions'){const i=await body(req),d=draws.find(x=>x.draw_id===i.draw_id);const x=createFundingInstruction(d,i);instructions.push(x);return json(res,201,x)}
 const sg=u.pathname.match(/^\/v1\/instructions\/([^/]+)\/signature$/);if(req.method==='POST'&&sg){const i=instructions.find(x=>x.instruction_id===decodeURIComponent(sg[1]));Object.assign(i,recordFundingSignature(i,await body(req)));return json(res,200,i)}
 const sb=u.pathname.match(/^\/v1\/instructions\/([^/]+)\/submit$/);if(req.method==='POST'&&sb){const i=instructions.find(x=>x.instruction_id===decodeURIComponent(sb[1]));Object.assign(i,submitFunding(i,await body(req)));return json(res,200,i)}
 const st=u.pathname.match(/^\/v1\/instructions\/([^/]+)\/settle$/);if(req.method==='POST'&&st){const i=instructions.find(x=>x.instruction_id===decodeURIComponent(st[1]));Object.assign(i,settleFunding(i,await body(req)));if(i.state==='SETTLED'){const a=createAdvanceLedgerEntry({facility_id:i.facility_id,draw_id:i.draw_id,asset:i.asset,principal:i.amount,settled_at:i.settled_at});advances.push(a);const d=draws.find(x=>x.draw_id===i.draw_id);if(d)Object.assign(d,{state:'SETTLED',settled_at:i.settled_at})}return json(res,200,i)}
 const ac=u.pathname.match(/^\/v1\/advances\/([^/]+)\/accrue$/);if(req.method==='POST'&&ac){const a=advances.find(x=>x.advance_id===decodeURIComponent(ac[1]));Object.assign(a,accrueInterest(a,await body(req)));return json(res,200,a)}
 const rs=u.pathname.match(/^\/v1\/advances\/([^/]+)\/schedule$/);if(req.method==='POST'&&rs){const a=advances.find(x=>x.advance_id===decodeURIComponent(rs[1]));const s=createRepaymentSchedule({advance:a,...await body(req)});repayments.push(...s);return json(res,201,{schedule:s})}
 const rp=u.pathname.match(/^\/v1\/advances\/([^/]+)\/repay$/);if(req.method==='POST'&&rp){const a=advances.find(x=>x.advance_id===decodeURIComponent(rp[1]));Object.assign(a,recordRepayment(a,await body(req)));return json(res,200,a)}
 const cr=u.pathname.match(/^\/v1\/advances\/([^/]+)\/collateral-release$/);if(req.method==='POST'&&cr){const a=advances.find(x=>x.advance_id===decodeURIComponent(cr[1]));return json(res,200,evaluateCollateralRelease({advance:a,...await body(req)}))}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_funding_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createFundingServer().listen(PORT,'0.0.0.0')
