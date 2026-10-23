import http from 'node:http'
import {createCase,addCaseIssue,createDeadline,evaluateDeadline,addInvestigationStep,createNotice,validateAdverseActionReasons,recordFurnisherResponse,createEvidencePackage,resolveCase,createCorrectionHandoff,createAuditExport,complianceSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8824),TOKEN=String(process.env.NEO_CREDIT_COMPLIANCE_OPERATOR_TOKEN||'')
const cases=[],deadlines=[],notices=[],responses=[],packages=[],handoffs=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
export function createCreditComplianceServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-credit-compliance'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/credit-compliance')return json(res,200,complianceSnapshot({cases,deadlines,notices,responses,packages,handoffs}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/cases'){const c=createCase(await body(req));cases.push(c);return json(res,201,c)}
 const issue=u.pathname.match(/^\/v1\/cases\/([^/]+)\/issues$/);if(req.method==='POST'&&issue){const c=cases.find(x=>x.case_id===decodeURIComponent(issue[1]));Object.assign(c,addCaseIssue(c,await body(req)));return json(res,200,c)}
 const step=u.pathname.match(/^\/v1\/cases\/([^/]+)\/investigation$/);if(req.method==='POST'&&step){const c=cases.find(x=>x.case_id===decodeURIComponent(step[1]));Object.assign(c,addInvestigationStep(c,await body(req)));return json(res,200,c)}
 if(req.method==='POST'&&u.pathname==='/v1/deadlines'){const d=createDeadline(await body(req));deadlines.push(d);return json(res,201,d)}
 if(req.method==='GET'&&u.pathname==='/v1/deadlines/overdue')return json(res,200,{items:deadlines.map(d=>evaluateDeadline(d)).filter(d=>d.overdue)})
 if(req.method==='POST'&&u.pathname==='/v1/notices'){const i=await body(req);if(i.notice_type==='ADVERSE_ACTION'){const vr=validateAdverseActionReasons(i.reasons||[]);if(!vr.valid)return json(res,422,{error:'invalid_adverse_action_reasons',invalid:vr.invalid})}const n=createNotice(i);notices.push(n);return json(res,201,n)}
 if(req.method==='POST'&&u.pathname==='/v1/furnisher-responses'){const r=recordFurnisherResponse(await body(req));responses.push(r);return json(res,201,r)}
 if(req.method==='POST'&&u.pathname==='/v1/evidence-packages'){const i=await body(req),c=cases.find(x=>x.case_id===i.case_id);const p=createEvidencePackage({package_id:i.package_id,caseFile:c,documents:i.documents||[],records:i.records||[],previous_digest:packages.at(-1)?.digest||null});packages.push(p);return json(res,201,p)}
 const resolve=u.pathname.match(/^\/v1\/cases\/([^/]+)\/resolve$/);if(req.method==='POST'&&resolve){const c=cases.find(x=>x.case_id===decodeURIComponent(resolve[1]));Object.assign(c,resolveCase(c,await body(req)));return json(res,200,c)}
 const hand=u.pathname.match(/^\/v1\/cases\/([^/]+)\/correction-handoff$/);if(req.method==='POST'&&hand){const c=cases.find(x=>x.case_id===decodeURIComponent(hand[1]));const i=await body(req),h=createCorrectionHandoff({caseFile:c,tradeline_id:i.tradeline_id,patch:i.patch,evidence_refs:i.evidence_refs||[]});handoffs.push(h);return json(res,201,h)}
 const exp=u.pathname.match(/^\/v1\/cases\/([^/]+)\/audit-export$/);if(req.method==='GET'&&exp){const c=cases.find(x=>x.case_id===decodeURIComponent(exp[1]));if(!c)return json(res,404,{error:'case_not_found'});return json(res,200,createAuditExport({caseFile:c,deadlines:deadlines.filter(x=>x.case_id===c.case_id),notices:notices.filter(x=>x.case_id===c.case_id),responses:responses.filter(x=>x.case_id===c.case_id),evidencePackages:packages.filter(x=>x.case_id===c.case_id)}))}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_credit_compliance_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createCreditComplianceServer().listen(PORT,'0.0.0.0')
