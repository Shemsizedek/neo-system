const state=globalThis.__neoTherapyState||(globalThis.__neoTherapyState={consents:new Map(),credentials:new Map(),sessions:new Map(),audit:[]})
const send=(res,status,data)=>res.status(status).json(data)
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store')
 const action=String(req.query?.action||'status')
 if(req.method==='GET'&&action==='status') return send(res,200,{service:'neotherapy',version:'1.0',storage:'ephemeral-server-runtime',persistent:false,boundary:'participant data is not general NEO intelligence'})
 if(req.method!=='POST') return send(res,405,{error:'METHOD_NOT_ALLOWED'})
 const body=req.body||{}
 if(action==='consent'){
  if(!body.participantId||!body.modalityId||!body.status) return send(res,400,{error:'INVALID_CONSENT'})
  const record={id:body.id||crypto.randomUUID(),participantId:body.participantId,modalityId:body.modalityId,version:body.version||'1.0',status:body.status,signedAt:body.status==='ACTIVE'?new Date().toISOString():body.signedAt,withdrawnAt:body.status==='WITHDRAWN'?new Date().toISOString():undefined}
  state.consents.set(record.participantId+':'+record.modalityId,record);state.audit.push({action:'CONSENT_'+record.status,resourceId:record.id,timestamp:new Date().toISOString()});return send(res,200,record)
 }
 if(action==='authorize'){
  const consent=state.consents.get(body.participantId+':'+body.modalityId);const credential=state.credentials.get(body.practitionerId)
  if(!consent||consent.status!=='ACTIVE') return send(res,403,{authorized:false,error:'ACTIVE_CONSENT_REQUIRED'})
  if(!credential||credential.status!=='ACTIVE') return send(res,403,{authorized:false,error:'ACTIVE_CREDENTIAL_REQUIRED'})
  if(!credential.modalities?.includes(body.modalityId)) return send(res,403,{authorized:false,error:'MODALITY_AUTHORIZATION_REQUIRED'})
  if(!body.safetyScreenComplete) return send(res,403,{authorized:false,error:'SAFETY_SCREEN_REQUIRED'})
  return send(res,200,{authorized:true})
 }
 if(action==='credential'){
  if(!body.practitionerId||!body.status) return send(res,400,{error:'INVALID_CREDENTIAL'})
  const record={id:body.id||crypto.randomUUID(),practitionerId:body.practitionerId,level:body.level||'C.Neo.',status:body.status,modalities:Array.isArray(body.modalities)?body.modalities:[]};state.credentials.set(record.practitionerId,record);state.audit.push({action:'CREDENTIAL_'+record.status,resourceId:record.id,timestamp:new Date().toISOString()});return send(res,200,record)
 }
 if(action==='session'){
  if(!body.participantId||!body.practitionerId) return send(res,400,{error:'INVALID_SESSION'})
  const record={...body,id:body.id||crypto.randomUUID(),createdAt:body.createdAt||new Date().toISOString()};state.sessions.set(record.id,record);state.audit.push({action:'SESSION_SAVED',resourceId:record.id,timestamp:new Date().toISOString()});return send(res,200,record)
 }
 return send(res,404,{error:'UNKNOWN_ACTION'})
}
