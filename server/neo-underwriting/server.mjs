import http from 'node:http'
import {createApplication,evaluateEligibility,calculateCapacity,invokeApprovedModel,evaluateCreditPolicy,createManualReview,resolveManualReview,createOffer,evaluateOfferExpiration,createDecisionRecord,underwritingSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8826),TOKEN=String(process.env.NEO_UNDERWRITING_OPERATOR_TOKEN||'')
const applications=[],decisions=[],reviews=[],offers=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
export function createUnderwritingServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-underwriting'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/underwriting')return json(res,200,underwritingSnapshot({applications,decisions,reviews,offers}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/applications'){const a=createApplication(await body(req));applications.push(a);return json(res,201,a)}
 const ev=u.pathname.match(/^\/v1\/applications\/([^/]+)\/evaluate$/);if(req.method==='POST'&&ev){const a=applications.find(x=>x.application_id===decodeURIComponent(ev[1]));if(!a)return json(res,404,{error:'application_not_found'});const i=await body(req),eligibility=evaluateEligibility(a,{rules:i.eligibility_rules||[]}),capacity=calculateCapacity(a,i.capacity_policy||{});let modelInvocation=null;if(i.model&&i.version&&i.model_result){modelInvocation=invokeApprovedModel({model:i.model,version:i.version,features:i.features||{},scorer:()=>i.model_result})}const policyDecision=evaluateCreditPolicy({application:a,eligibility,capacity,modelResult:modelInvocation,policy:i.credit_policy||{}});let review=null;if(policyDecision.decision!=='APPROVE'&&i.create_manual_review!==false){review=createManualReview({application_id:a.application_id,reason_codes:policyDecision.reasons});reviews.push(review)}const decision=createDecisionRecord({application:a,eligibility,capacity,modelInvocation,policyDecision,manualReview:review});decisions.push(decision);return json(res,200,decision)}
 const rv=u.pathname.match(/^\/v1\/reviews\/([^/]+)\/resolve$/);if(req.method==='POST'&&rv){const r=reviews.find(x=>x.review_id===decodeURIComponent(rv[1]));if(!r)return json(res,404,{error:'review_not_found'});Object.assign(r,resolveManualReview(r,await body(req)));return json(res,200,r)}
 const of=u.pathname.match(/^\/v1\/applications\/([^/]+)\/offer$/);if(req.method==='POST'&&of){const a=applications.find(x=>x.application_id===decodeURIComponent(of[1])),i=await body(req),d=decisions.filter(x=>x.application_id===a?.application_id).at(-1);if(!a||!d)return json(res,404,{error:'application_or_decision_not_found'});const policyDecision=d.policy_decision?.decision==='APPROVE'?d.policy_decision:(d.manual_review?.outcome==='APPROVE'?{decision:'APPROVE'}:d.policy_decision);const o=createOffer({application:a,decision:policyDecision,terms:i.terms||{},expires_at:i.expires_at});offers.push(o);return json(res,201,o)}
 if(req.method==='GET'&&u.pathname==='/v1/offers')return json(res,200,{items:offers.map(x=>evaluateOfferExpiration(x))})
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_underwriting_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createUnderwritingServer().listen(PORT,'0.0.0.0')
