import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
const allowedTypes=new Set(['form.submission.received','booking.request.received','deal.intake.received','content.draft.requested','commerce.notice.received'])
const textId=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const maxBytes=16384, windowMs=300000
const same=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export function createUpstashReceiptStore({url,token,fetchImpl=fetch}={}){
  if(!url||!token||!/^https:\/\//.test(url))return {durable:false}
  const cmd=async(...args)=>{
    const endpoint=`${url.replace(/\/$/,'')}/${args.map(x=>encodeURIComponent(x)).join('/')}`
    const res=await fetchImpl(endpoint,{headers:{Authorization:`Bearer ${token}`}})
    if(!res.ok)throw new Error('receipt_store_unavailable')
    const json=await res.json()
    if(json.error)throw new Error('receipt_store_unavailable')
    return json.result
  }
  return {durable:true,async insertOnce(id,record){
    const key=`neo:bitflows:v1:${createHash('sha256').update(id).digest('hex')}`
    const inserted=await cmd('SET',key,JSON.stringify(record),'NX','EX','604800')
    if(inserted==='OK')return {inserted:true,record}
    const existing=await cmd('GET',key)
    if(!existing)throw new Error('receipt_store_unavailable')
    return {inserted:false,record:JSON.parse(existing)}
  }}
}
export async function processBitflowsRequest({method='POST',headers={},rawBody,env={},store,now=Date.now()}={}){
  const respond=(status,body)=>({status,body})
  if(method!=='POST')return respond(405,{error:'method_not_allowed'})
  if(env.NEO_BITFLOWS_ENABLED!=='true')return respond(503,{error:'integration_disabled'})
  if(typeof rawBody!=='string'||Buffer.byteLength(rawBody)>maxBytes)return respond(413,{error:'payload_too_large'})
  const secret=env.NEO_BITFLOWS_HMAC_SECRET
  if(typeof secret!=='string'||secret.length<32)return respond(503,{error:'auth_not_configured'})
  const header=name=>headers[name]??headers[name.toLowerCase()]??''
  const timestamp=String(header('x-neo-timestamp')),signature=String(header('x-neo-signature'))
  if(!/^\d{13}$/.test(timestamp)||!/^sha256=[a-f0-9]{64}$/.test(signature))return respond(401,{error:'unauthorized'})
  const time=Number(timestamp)
  if(!Number.isFinite(now)||Math.abs(now-time)>windowMs)return respond(401,{error:'expired_or_future_signature'})
  const expected=`sha256=${createHmac('sha256',secret).update(`${timestamp}.${rawBody}`).digest('hex')}`
  if(!same(expected,signature))return respond(401,{error:'unauthorized'})
  let event
  try{event=JSON.parse(rawBody)}catch{return respond(400,{error:'invalid_json'})}
  if(!event||Array.isArray(event)||typeof event!=='object'||event.schema_version!=='neo.bitflows.event.v1'||event.source!=='holytemples.org'||!textId.test(event.event_id??'')||!textId.test(event.correlation_id??'')||!allowedTypes.has(event.event_type)||!event.subject||typeof event.subject!=='object'||!textId.test(event.subject.external_id??'')||!['lead','booking','deal','content','commerce'].includes(event.subject.type)||!event.data||typeof event.data!=='object'||Array.isArray(event.data)||!Number.isFinite(Date.parse(event.occurred_at))||Math.abs(Date.parse(event.occurred_at)-now)>windowMs)return respond(400,{error:'invalid_event_schema'})
  if(event.data.test_only!==true)return respond(403,{error:'test_only_required'})
  if(!store?.durable||typeof store.insertOnce!=='function')return respond(503,{error:'durable_store_unavailable'})
  const digest=createHash('sha256').update(rawBody).digest('hex')
  const receipt={event_id:event.event_id,correlation_id:event.correlation_id,digest,status:'accepted_for_review',recorded_at:new Date(now).toISOString()}
  try{
    const saved=await store.insertOnce(`holytemples.org:${event.event_id}`,receipt)
    if(saved.record.digest!==digest)return respond(409,{error:'event_id_conflict'})
    const {digest:ignored,...publicReceipt}=saved.record
    return respond(saved.inserted?202:200,{duplicate:!saved.inserted,receipt:publicReceipt})
  }catch{return respond(503,{error:'durable_store_unavailable'})}
}
