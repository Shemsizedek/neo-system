import http from 'node:http'
import {acceptOffer,createDisclosurePackage,acknowledgeDisclosure,createAgreementVersion,finalizeAgreement,createSignatureRequest,recordSignature,evaluateConditions,fundingReadiness,createOriginationEvidence,originationSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8828),TOKEN=String(process.env.NEO_ORIGINATION_OPERATOR_TOKEN||'')
const acceptances=[],disclosures=[],agreements=[],signatures=[],readiness=[],evidence=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
function ev(type,application_id,data){const e=createOriginationEvidence({event_type:type,application_id,data,previous_digest:evidence.at(-1)?.digest||null});evidence.push(e)}
export function createOriginationServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-origination'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/origination')return json(res,200,originationSnapshot({acceptances,disclosures,agreements,signatures,readiness,evidence}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/acceptances'){const i=await body(req),a=acceptOffer(i);acceptances.push(a);ev('OFFER_ACCEPTED',a.application_id,a);return json(res,201,a)}
 if(req.method==='POST'&&u.pathname==='/v1/disclosures'){const d=createDisclosurePackage(await body(req));disclosures.push(d);return json(res,201,d)}
 const ack=u.pathname.match(/^\/v1\/disclosures\/([^/]+)\/acknowledge$/);if(req.method==='POST'&&ack){const d=disclosures.find(x=>x.disclosure_id===decodeURIComponent(ack[1]));Object.assign(d,acknowledgeDisclosure(d,await body(req)));return json(res,200,d)}
 if(req.method==='POST'&&u.pathname==='/v1/agreements'){const a=createAgreementVersion(await body(req));agreements.push(a);return json(res,201,a)}
 const fin=u.pathname.match(/^\/v1\/agreements\/([^/]+)\/finalize$/);if(req.method==='POST'&&fin){const a=agreements.find(x=>x.agreement_id===decodeURIComponent(fin[1])),i=await body(req),d=disclosures.find(x=>x.disclosure_id===i.disclosure_id);Object.assign(a,finalizeAgreement(a,{disclosure:d,approved:i.approved!==false}));return json(res,200,a)}
 if(req.method==='POST'&&u.pathname==='/v1/signature-requests'){const i=await body(req),a=agreements.find(x=>x.agreement_id===i.agreement_id);const r=createSignatureRequest(a,i);signatures.push(r);return json(res,201,r)}
 const sig=u.pathname.match(/^\/v1\/signature-requests\/([^/]+)\/sign$/);if(req.method==='POST'&&sig){const r=signatures.find(x=>x.request_id===decodeURIComponent(sig[1]));Object.assign(r,recordSignature(r,await body(req)));return json(res,200,r)}
 if(req.method==='POST'&&u.pathname==='/v1/readiness'){const i=await body(req),c=evaluateConditions({conditions:i.conditions||[]}),r=fundingReadiness({acceptance:acceptances.find(x=>x.acceptance_id===i.acceptance_id),disclosure:disclosures.find(x=>x.disclosure_id===i.disclosure_id),agreement:agreements.find(x=>x.agreement_id===i.agreement_id),signature:signatures.find(x=>x.request_id===i.signature_request_id),conditions:c});readiness.push(r);return json(res,200,{conditions:c,readiness:r})}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_origination_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createOriginationServer().listen(PORT,'0.0.0.0')
