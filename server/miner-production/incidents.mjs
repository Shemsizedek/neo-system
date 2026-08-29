const now=()=>new Date().toISOString()

export const INCIDENT_STATES={OPEN:'OPEN',ACKNOWLEDGED:'ACKNOWLEDGED',RESOLVED:'RESOLVED'}

export function incidentBlocksPayout(incidents=[],payoutId){
  return incidents.some(i=>i.payoutId===payoutId&&i.state!==INCIDENT_STATES.RESOLVED)
}

export function acknowledgeIncident(incident,{operatorId,note=''}){
  if(!incident?.id) throw new Error('INCIDENT_REQUIRED')
  if(incident.state!==INCIDENT_STATES.OPEN) throw new Error('INCIDENT_STATE_INVALID')
  if(!operatorId) throw new Error('OPERATOR_ID_REQUIRED')
  return {...incident,state:INCIDENT_STATES.ACKNOWLEDGED,acknowledgedBy:operatorId,acknowledgedAt:now(),acknowledgementNote:String(note||''),resolvedAt:null,resolvedBy:null,resolutionNote:null}
}

export function resolveIncident(incident,{operatorId,note='',resolutionCode}){
  if(!incident?.id) throw new Error('INCIDENT_REQUIRED')
  if(![INCIDENT_STATES.OPEN,INCIDENT_STATES.ACKNOWLEDGED].includes(incident.state)) throw new Error('INCIDENT_STATE_INVALID')
  if(!operatorId) throw new Error('OPERATOR_ID_REQUIRED')
  if(!resolutionCode) throw new Error('RESOLUTION_CODE_REQUIRED')
  return {...incident,state:INCIDENT_STATES.RESOLVED,resolvedBy:operatorId,resolvedAt:now(),resolutionCode:String(resolutionCode),resolutionNote:String(note||'')}
}

export function incidentContext({incident,payout=null,psbts=[],finalizedTransactions=[]}){
  if(!incident?.id) throw new Error('INCIDENT_REQUIRED')
  const payoutId=incident.payoutId
  const payoutPsbts=psbts.filter(v=>v.payoutId===payoutId).map(v=>({psbtId:v.psbtId,createdAt:v.createdAt,feeBtc:v.feeBtc,signingMode:v.signingMode}))
  const finalized=finalizedTransactions.filter(v=>v.payoutId===payoutId).map(v=>({psbtId:v.psbtId,complete:v.complete,finalizedAt:v.finalizedAt}))
  return {incident,payout:payout?{id:payout.id,state:payout.state,amountBtc:payout.amountBtc,txid:payout.txid||null,broadcastAt:payout.broadcastAt||null,confirmations:payout.confirmations||0}:null,psbts:payoutPsbts,finalizedTransactions:finalized,blocked:incident.state!==INCIDENT_STATES.RESOLVED}
}

export function incidentSummary(incidents=[]){
  const open=incidents.filter(i=>i.state===INCIDENT_STATES.OPEN).length
  const acknowledged=incidents.filter(i=>i.state===INCIDENT_STATES.ACKNOWLEDGED).length
  const resolved=incidents.filter(i=>i.state===INCIDENT_STATES.RESOLVED).length
  return {total:incidents.length,open,acknowledged,resolved,blocking:open+acknowledged}
}
