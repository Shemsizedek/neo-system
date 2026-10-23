import { createHash, randomUUID } from 'node:crypto';
const OFFERS = Object.freeze(['Strategic Architecture','AI Application MVP','White-label Foundation']);
const BUDGETS = Object.freeze(['$75,000–$150,000','$150,000–$300,000','$300,000–$750,000','$750,000+']);
const TIMELINES = Object.freeze(['Within 30 days','1–3 months','3–6 months','Exploratory']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const trim=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
export class IntakeError extends Error {
  constructor(code,status=400){super(code);this.code=code;this.status=status;}
}
export function validateInquiry(raw={}) {
  if(!raw||Array.isArray(raw)||typeof raw!=='object')throw new IntakeError('invalid_body');
  if(Object.keys(raw).length>12)throw new IntakeError('extra_fields');
  if(raw.website)throw new IntakeError('spam_rejected');
  if(raw.consent!==true)throw new IntakeError('consent_required');
  const organization=trim(raw.company,120),email=trim(raw.email,200).toLowerCase();
  const project=trim(raw.project,2000),service=trim(raw.service,80),budget=trim(raw.budget,40),timeline=trim(raw.timeline,40);
  if(organization.length<2||!EMAIL.test(email)||project.length<20)throw new IntakeError('required_fields_invalid');
  if(!OFFERS.includes(service)||!BUDGETS.includes(budget)||!TIMELINES.includes(timeline))throw new IntakeError('invalid_selection');
  if([raw.company,raw.email,raw.project].some(v=>typeof v!=='string'))throw new IntakeError('invalid_field_type');
  if(raw.company.length>120||raw.email.length>200||raw.project.length>2000)throw new IntakeError('field_too_long');
  return {organization,email,project,service,budget,timeline,consent:true};
}
const readJson=async(req,maxBytes=8192)=>{
  const chunks=[];let length=0;
  for await(const part of req){length+=part.length;if(length>maxBytes)throw new IntakeError('body_too_large',413);chunks.push(part);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new IntakeError('invalid_json');}
};
function reply(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));}
export function makeLeadIntake({origin,store,rateLimiter,enabled=false}={}) {
  // Production safety: deny all submissions unless an audited durable store,
  // distributed rate limiter and explicit feature flag have been supplied.
  const ready=enabled && /^https:\/\//.test(origin||'') && store?.insertIfAbsent && rateLimiter?.allow;
  return async function leadIntake(req,res){
    if(req.method!=='POST')return reply(res,405,{error:'method_not_allowed'});
    if(!ready)return reply(res,503,{error:'intake_not_configured'});
    if(req.headers.origin!==origin)return reply(res,403,{error:'origin_not_allowed'});
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return reply(res,415,{error:'json_required'});
    try{
      // Proxy headers are deliberately not trusted for caller identity.
      const permitted=await rateLimiter.allow(req.socket?.remoteAddress||'unknown');
      if(!permitted)return reply(res,429,{error:'rate_limited'});
      const body=await readJson(req);
      const lead=validateInquiry(body);
      const key=trim(req.headers['idempotency-key'],100);
      if(!/^[a-zA-Z0-9_-]{16,100}$/.test(key))throw new IntakeError('idempotency_key_required');
      // Hash key and email so the idempotency key cannot become a PII lookup.
      const fingerprint=createHash('sha256').update(key+'|'+lead.email).digest('hex');
      const id=randomUUID();
      const record={id,...lead,status:'received_unqualified',createdAt:new Date().toISOString(),source:'neo_enterprise_web'};
      const outcome=await store.insertIfAbsent(fingerprint,record);
      if(!outcome||typeof outcome.id!=='string')throw new Error('invalid_store_result');
      return reply(res,202,{id:outcome.id,status:'received',duplicate:outcome.id!==id});
    }catch(e){
      if(e instanceof IntakeError)return reply(res,e.status,{error:e.code});
      // Internal error and user PII are never returned to the browser.
      return reply(res,503,{error:'intake_temporarily_unavailable'});
    }
  };
}
