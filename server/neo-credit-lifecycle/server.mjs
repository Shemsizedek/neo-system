import http from 'node:http'
import {createLifecycle,transitionLifecycle,createEvent,applyIdempotentEvent,createSaga,recordSagaStep,createRecoveryAction,routeException,createTimelineEntry,lifecycleSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8829),TOKEN=String(process.env.NEO_CREDIT_LIFECYCLE_OPERATOR_TOKEN||'')
const lifecycles=[],events=[],sagas=[],recoveries=[],routes=[],timeline=[],processedKeys=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
export function createCreditLifecycleServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-credit-lifecycle'})
 if(req.method==='GET'&&u.pathname==='/v1/estate/lifecycle')return json(res,200,lifecycleSnapshot({lifecycles,events,sagas,recoveries,routes,timeline}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/lifecycles'){const l=createLifecycle(await body(req));lifecycles.push(l);timeline.push(createTimelineEntry({lifecycle_id:l.lifecycle_id,event_type:'LIFECYCLE_CREATED',state:l.state,service_ref:'G144'}));return json(res,201,l)}
 if(req.method==='POST'&&u.pathname==='/v1/events'){const e=createEvent(await body(req)),d=applyIdempotentEvent({event:e,processedKeys});if(d.duplicate)return json(res,200,{duplicate:true,event_id:e.event_id});processedKeys.push(e.idempotency_key);events.push(e);return json(res,201,e)}
 const tr=u.pathname.match(/^\/v1\/lifecycles\/([^/]+)\/transition$/);if(req.method==='POST'&&tr){const l=lifecycles.find(x=>x.lifecycle_id===decodeURIComponent(tr[1]));if(!l)return json(res,404,{error:'lifecycle_not_found'});const i=await body(req);Object.assign(l,transitionLifecycle(l,i));timeline.push(createTimelineEntry({lifecycle_id:l.lifecycle_id,event_type:i.event_type||'STATE_TRANSITION',state:l.state,evidence_ref:i.evidence_ref,service_ref:i.service_ref,data:i.data||{}}));return json(res,200,l)}
 if(req.method==='POST'&&u.pathname==='/v1/sagas'){const s=createSaga(await body(req));sagas.push(s);return json(res,201,s)}
 const st=u.pathname.match(/^\/v1\/sagas\/([^/]+)\/steps$/);if(req.method==='POST'&&st){const s=sagas.find(x=>x.saga_id===decodeURIComponent(st[1]));Object.assign(s,recordSagaStep(s,await body(req)));return json(res,200,s)}
 const rc=u.pathname.match(/^\/v1\/sagas\/([^/]+)\/recover$/);if(req.method==='POST'&&rc){const s=sagas.find(x=>x.saga_id===decodeURIComponent(rc[1]));const r=createRecoveryAction({saga:s,...await body(req)});recoveries.push(r);return json(res,201,r)}
 const xr=u.pathname.match(/^\/v1\/lifecycles\/([^/]+)\/route-exception$/);if(req.method==='POST'&&xr){const l=lifecycles.find(x=>x.lifecycle_id===decodeURIComponent(xr[1]));const r=routeException({lifecycle:l,...await body(req)});routes.push(r);if(r.target==='GATE139')l.state='COMPLIANCE_CASE';timeline.push(createTimelineEntry({lifecycle_id:l.lifecycle_id,event_type:'EXCEPTION_ROUTED',state:l.state,service_ref:'G144',data:r}));return json(res,201,r)}
 const tl=u.pathname.match(/^\/v1\/lifecycles\/([^/]+)\/timeline$/);if(req.method==='GET'&&tl)return json(res,200,{items:timeline.filter(x=>x.lifecycle_id===decodeURIComponent(tl[1]))})
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_credit_lifecycle_error',detail:String(e?.message||e)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createCreditLifecycleServer().listen(PORT,'0.0.0.0')
