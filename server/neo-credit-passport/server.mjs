import http from 'node:http'
import {createTradeline,createProof,mapTradelineToMetro2,createDispute,resolveDispute,calculateNeoCreditRating,createRatingHistory,createCreditPassport,createCrownCreditCertificate,creditPassportSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8821),TOKEN=String(process.env.NEO_CREDIT_PASSPORT_OPERATOR_TOKEN||'')
const tradelines=[],proofs=[],disputes=[],ratings=[],passports=[],certificates=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
export function createCreditPassportServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-credit-passport'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/credit-passport')return json(res,200,creditPassportSnapshot({tradelines,proofs,disputes,ratings,passports,certificates}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/tradelines'){const t=createTradeline(await body(req));tradelines.push(t);return json(res,201,{tradeline:t,metro2:mapTradelineToMetro2(t)})}
 if(req.method==='POST'&&u.pathname==='/v1/proofs'){const p=createProof(await body(req));proofs.push(p);return json(res,201,p)}
 if(req.method==='POST'&&u.pathname==='/v1/disputes'){const d=createDispute(await body(req));disputes.push(d);return json(res,201,d)}
 const dr=u.pathname.match(/^\/v1\/disputes\/([^/]+)\/resolve$/);if(req.method==='POST'&&dr){const d=disputes.find(x=>x.dispute_id===decodeURIComponent(dr[1]));if(!d)return json(res,404,{error:'dispute_not_found'});const x=resolveDispute(d,await body(req));Object.assign(d,x.dispute);if(x.tradeline_patch){const t=tradelines.find(x=>x.tradeline_id===d.tradeline_id);if(t)Object.assign(t,x.tradeline_patch,{updated_at:new Date().toISOString()})}return json(res,200,x)}
 const rate=u.pathname.match(/^\/v1\/subjects\/([^/]+)\/rate$/);if(req.method==='POST'&&rate){const subject_id=decodeURIComponent(rate[1]),r=calculateNeoCreditRating({tradelines:tradelines.filter(t=>t.subject_id===subject_id),proofs:proofs.filter(p=>p.subject_id===subject_id),disputes:disputes.filter(d=>d.subject_id===subject_id)}),prev=ratings.filter(x=>x.subject_id===subject_id).at(-1)?.digest||null,h=createRatingHistory({subject_id,rating:r,previous_digest:prev});ratings.push(h);return json(res,200,{rating:r,history:h})}
 const pass=u.pathname.match(/^\/v1\/subjects\/([^/]+)\/passport$/);if(req.method==='POST'&&pass){const subject_id=decodeURIComponent(pass[1]),i=await body(req),h=ratings.filter(x=>x.subject_id===subject_id).at(-1);if(!h)return json(res,409,{error:'rating_required'});const p=createCreditPassport({subject_id,tradelines:tradelines.filter(t=>t.subject_id===subject_id),proofs:proofs.filter(x=>x.subject_id===subject_id),rating:h.rating,disputes:disputes.filter(d=>d.subject_id===subject_id),visibility:i.visibility||'PRIVATE'});passports.push(p);return json(res,201,p)}
 const cert=u.pathname.match(/^\/v1\/passports\/([^/]+)\/certificate$/);if(req.method==='POST'&&cert){const p=passports.find(x=>x.passport_id===decodeURIComponent(cert[1]));if(!p)return json(res,404,{error:'passport_not_found'});const h=ratings.filter(x=>x.subject_id===p.subject_id).at(-1);const c=createCrownCreditCertificate({passport:p,rating_history_digest:h.digest,evidence_refs:(await body(req)).evidence_refs||[]});certificates.push(c);return json(res,201,c)}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_credit_passport_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createCreditPassportServer().listen(PORT,'0.0.0.0')
