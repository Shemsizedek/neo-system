import http from 'node:http'
import {registerModel,createModelVersion,validateModelVersion,backtestModel,approveModelVersion,activateModel,validateReasonCode,createOverride,monitorDrift,retireModel,createModelEvidence,modelRiskSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8825),TOKEN=String(process.env.NEO_CREDIT_MODEL_RISK_OPERATOR_TOKEN||'')
const models=[],versions=[],validations=[],approvals=[],overrides=[],drift=[],evidence=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
function ev(type,model_id,version,data){const e=createModelEvidence({event_type:type,model_id,version,data,previous_digest:evidence.at(-1)?.digest||null});evidence.push(e)}
export function createModelRiskServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-credit-model-risk'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/model-risk')return json(res,200,modelRiskSnapshot({models,versions,validations,approvals,overrides,drift,evidence}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/models'){const m=registerModel(await body(req));models.push(m);ev('MODEL_REGISTERED',m.model_id,null,m);return json(res,201,m)}
 if(req.method==='POST'&&u.pathname==='/v1/versions'){const v=createModelVersion(await body(req));versions.push(v);ev('VERSION_CREATED',v.model_id,v.version,{specification_digest:v.specification_digest});return json(res,201,v)}
 const val=u.pathname.match(/^\/v1\/models\/([^/]+)\/versions\/([^/]+)\/validate$/);if(req.method==='POST'&&val){const v=versions.find(x=>x.model_id===decodeURIComponent(val[1])&&x.version===decodeURIComponent(val[2]));const x=validateModelVersion(v,await body(req));Object.assign(v,x.version);validations.push(x.validation);ev('MODEL_VALIDATED',v.model_id,v.version,x.validation);return json(res,200,x)}
 const back=u.pathname.match(/^\/v1\/models\/([^/]+)\/versions\/([^/]+)\/backtest$/);if(req.method==='POST'&&back){const r=backtestModel({model_id:decodeURIComponent(back[1]),version:decodeURIComponent(back[2]),...await body(req)});return json(res,200,r)}
 const approve=u.pathname.match(/^\/v1\/models\/([^/]+)\/versions\/([^/]+)\/approve$/);if(req.method==='POST'&&approve){const v=versions.find(x=>x.model_id===decodeURIComponent(approve[1])&&x.version===decodeURIComponent(approve[2]));const x=approveModelVersion(v,await body(req));Object.assign(v,x.version);approvals.push(x.approval);ev('MODEL_APPROVAL',v.model_id,v.version,x.approval);return json(res,200,x)}
 const activate=u.pathname.match(/^\/v1\/models\/([^/]+)\/versions\/([^/]+)\/activate$/);if(req.method==='POST'&&activate){const m=models.find(x=>x.model_id===decodeURIComponent(activate[1])),v=versions.find(x=>x.model_id===m.model_id&&x.version===decodeURIComponent(activate[2]));Object.assign(m,activateModel(m,v));ev('MODEL_ACTIVATED',m.model_id,v.version,{});return json(res,200,m)}
 if(req.method==='POST'&&u.pathname==='/v1/overrides'){const o=createOverride(await body(req));overrides.push(o);ev('MODEL_OVERRIDE',o.model_id,o.version,o);return json(res,201,o)}
 if(req.method==='POST'&&u.pathname==='/v1/drift'){const d=monitorDrift(await body(req));drift.push(d);return json(res,200,d)}
 const retire=u.pathname.match(/^\/v1\/models\/([^/]+)\/versions\/([^/]+)\/retire$/);if(req.method==='POST'&&retire){const m=models.find(x=>x.model_id===decodeURIComponent(retire[1])),v=versions.find(x=>x.model_id===m.model_id&&x.version===decodeURIComponent(retire[2]));const r=retireModel(m,v,await body(req));Object.assign(m,r.model);Object.assign(v,r.version);ev('MODEL_RETIRED',m.model_id,v.version,r.retirement);return json(res,200,r)}
 const reason=u.pathname.match(/^\/v1\/models\/([^/]+)\/versions\/([^/]+)\/reason-codes\/([^/]+)$/);if(req.method==='GET'&&reason){const v=versions.find(x=>x.model_id===decodeURIComponent(reason[1])&&x.version===decodeURIComponent(reason[2]));return json(res,200,validateReasonCode(v,{code:decodeURIComponent(reason[3])}))}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_credit_model_risk_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createModelRiskServer().listen(PORT,'0.0.0.0')
