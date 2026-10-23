import http from 'node:http'
import {createCreditFacility,createHaircutSchedule,createMarginAgreement,evaluateCollateral,evaluateConcentration,calculateCreditUtilization,evaluateCreditRequest,createFinancingTerms,createCreditEvidence,creditSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8818),TOKEN=String(process.env.NEO_CREDIT_CONTROL_OPERATOR_TOKEN||'')
const facilities=[],haircuts=[],agreements=[],terms=[],evidence=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
function ev(type,facility_id,data){const e=createCreditEvidence({event_type:type,facility_id,data,previous_digest:evidence.at(-1)?.digest||null});evidence.push(e)}
export function createCreditControlServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-credit-control'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/credit')return json(res,200,creditSnapshot({facilities,haircuts,agreements,terms,evidence}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/facilities'){const f=createCreditFacility(await body(req));facilities.push(f);ev('FACILITY_CREATED',f.facility_id,f);return json(res,201,f)}
 if(req.method==='POST'&&u.pathname==='/v1/haircuts'){const h=createHaircutSchedule(await body(req));haircuts.push(h);return json(res,201,h)}
 if(req.method==='POST'&&u.pathname==='/v1/margin-agreements'){const a=createMarginAgreement(await body(req));agreements.push(a);return json(res,201,a)}
 if(req.method==='POST'&&u.pathname==='/v1/financing-terms'){const t=createFinancingTerms(await body(req));terms.push(t);return json(res,201,t)}
 if(req.method==='POST'&&u.pathname==='/v1/evaluate'){const i=await body(req),f=facilities.find(x=>x.facility_id===i.facility_id),h=haircuts.find(x=>x.schedule_id===i.schedule_id),a=agreements.find(x=>x.agreement_id===i.agreement_id);if(!f||!h)return json(res,404,{error:'facility_or_schedule_not_found'});const ce=evaluateCollateral({records:i.collateral||[],schedule:h}),cc=evaluateConcentration(ce),cu=calculateCreditUtilization({facility:f,outstanding:i.outstanding||0,reserved:i.reserved||0,collateralEvaluation:ce,agreement:a}),decision=evaluateCreditRequest({facility:f,utilization:cu,amount:i.amount,concentration:cc,accountStatus:i.account_status||'ACTIVE'});ev('CREDIT_EVALUATED',f.facility_id,{decision,utilization:cu,concentration:cc});return json(res,200,{collateral:ce,concentration:cc,utilization:cu,decision})}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_credit_control_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createCreditControlServer().listen(PORT,'0.0.0.0')
