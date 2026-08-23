import {createHmac,randomUUID} from 'node:crypto'
import {processCommunication} from './communications.mjs'

const now=()=>new Date().toISOString()
const key=()=>process.env.NEO_TRIBUNAL_RECEIPT_KEY||process.env.NEO_TRIBUNAL_MASTER_KEY||'development-receipt-key'
const sign=value=>createHmac('sha256',key()).update(JSON.stringify(value)).digest('hex')
const providerForChannel={EMAIL:'SMTP',CERTIFIED_EMAIL:'CERTIFIED_EMAIL',WEBHOOK:'WEBHOOK'}

export const providerAdapters={
  RECORD:{type:'RECORD',mode:'LOCAL',description:'Internal Tribunal record delivery.'},
  SMTP:{type:'SMTP',mode:'BOUNDARY_ONLY',description:'SMTP worker interface. External transport requires a deployed provider implementation.'},
  CERTIFIED_EMAIL:{type:'CERTIFIED_EMAIL',mode:'BOUNDARY_ONLY',description:'Certified-email provider interface with receipt callback support.'},
  WEBHOOK:{type:'WEBHOOK',mode:'BOUNDARY_ONLY',description:'Signed webhook provider interface. Network dispatch requires a deployed provider implementation.'}
}

export function adapterStatus(db,service,principal,workspaceId){
  service.authorize(principal,workspaceId,'REVIEWER')
  const configs=db.prepare('SELECT id,provider_type,label,enabled,updated_at FROM provider_configs WHERE workspace_id=? ORDER BY provider_type,label').all(workspaceId)
  return Object.values(providerAdapters).map(adapter=>({
    ...adapter,
    configs:configs.filter(c=>c.provider_type===adapter.type).map(c=>({id:c.id,label:c.label,enabled:Boolean(c.enabled),updatedAt:c.updated_at})),
    ready:adapter.type==='RECORD'||configs.some(c=>c.provider_type===adapter.type&&c.enabled)
  }))
}

export function runCommunicationWorker(db,service,principal,workspaceId,{limit=25,maxAttempts=3}={}){
  service.authorize(principal,workspaceId,'CLERK')
  const due=db.prepare("SELECT * FROM communication_outbox WHERE workspace_id=? AND status IN ('READY','QUEUED','RETRY') AND (next_attempt_at IS NULL OR next_attempt_at<=?) ORDER BY created_at LIMIT ?").all(workspaceId,now(),Math.max(1,Math.min(Number(limit)||25,100)))
  const results=[]
  for(const item of due){
    if(item.channel==='RECORD'){results.push(processCommunication(db,service,principal,workspaceId,item.id,{outcome:'DELIVERED',maxAttempts}));continue}
    const providerType=providerForChannel[item.channel]
    const provider=db.prepare('SELECT id,label FROM provider_configs WHERE workspace_id=? AND provider_type=? AND enabled=1 ORDER BY updated_at DESC LIMIT 1').get(workspaceId,providerType)
    if(!provider){results.push(processCommunication(db,service,principal,workspaceId,item.id,{outcome:'FAILED',error:`No enabled ${providerType||item.channel} provider configuration.`,maxAttempts}));continue}
    const result=processCommunication(db,service,principal,workspaceId,item.id,{maxAttempts})
    const providerRef=`${providerType.toLowerCase()}:${provider.id}:${randomUUID()}`
    db.prepare('UPDATE communication_outbox SET provider_ref=?,updated_at=? WHERE id=?').run(providerRef,now(),item.id)
    results.push({...result,providerType,providerLabel:provider.label,providerRef,dispatchMode:'BOUNDARY_ONLY'})
  }
  service.audit(principal,workspaceId,'COMMUNICATION_WORKER_RUN',workspaceId,{processed:results.length})
  return{workspaceId,processed:results.length,results,ranAt:now()}
}

export function acknowledgeProviderReceipt(db,service,principal,workspaceId,id,input){
  service.authorize(principal,workspaceId,'CLERK')
  const item=db.prepare('SELECT * FROM communication_outbox WHERE id=? AND workspace_id=?').get(id,workspaceId)
  if(!item)throw new Error('Communication not found.')
  const outcome=String(input.outcome||'').toUpperCase()
  if(!['DELIVERED','FAILED'].includes(outcome))throw new Error('Receipt outcome must be DELIVERED or FAILED.')
  const result=processCommunication(db,service,principal,workspaceId,id,{outcome,error:input.error,providerRef:input.providerRef||item.provider_ref,receipt:input.receipt||{},maxAttempts:input.maxAttempts||3})
  const signed={communicationId:id,outcome:result.status,providerRef:result.providerRef||item.provider_ref,receivedAt:now(),details:input.receipt||{}}
  const signature=sign(signed)
  db.prepare('UPDATE communication_outbox SET receipt_json=?,updated_at=? WHERE id=?').run(JSON.stringify({...signed,signature,algorithm:'HMAC-SHA256'}),now(),id)
  service.audit(principal,workspaceId,'PROVIDER_RECEIPT_RECORDED',id,{status:result.status,signature})
  return{...result,receipt:{...signed,signature,algorithm:'HMAC-SHA256'}}
}
