import {createRecoveryIncident} from './recovery.mjs'
import {INCIDENT_STATES} from './incidents.mjs'
import {verifyRuntimeAttestation} from './runtimeIdentity.mjs'

export const RUNTIME_DRIFT_REASON='RUNTIME_IDENTITY_DRIFT'
export const RUNTIME_DRIFT_SOURCE='RUNTIME_IDENTITY'

const incidentDetail=attestation=>({
  reasons:[...(attestation?.drift?.reasons||[])],
  observed:{
    commitSha:attestation?.identity?.buildCommitSha||null,
    imageDigest:attestation?.identity?.runtimeImageDigest||null
  },
  authorized:{
    commitSha:attestation?.identity?.authorizedCommitSha||null,
    imageDigest:attestation?.identity?.authorizedImageDigest||null
  },
  environment:attestation?.identity?.environment||null,
  detectedAt:attestation?.generatedAt||new Date().toISOString()
})

export function activeRuntimeDriftIncidents(store){
  return store.list('recovery_incident').filter(i=>i.source===RUNTIME_DRIFT_SOURCE&&i.reason===RUNTIME_DRIFT_REASON&&i.state!==INCIDENT_STATES.RESOLVED)
}

export async function reconcileRuntimeDriftIncident({store,attestation,secret,notify=async()=>{}}={}){
  if(!store)throw new Error('DRIFT_INCIDENT_STORE_REQUIRED')
  if(!attestation)throw new Error('RUNTIME_ATTESTATION_REQUIRED')
  const active=activeRuntimeDriftIncidents(store)

  if(attestation.drift?.state!=='GREEN'||attestation.drift?.holdFinancialMutations){
    if(active.length)return {state:'HOLD',incident:active[0],created:false}
    const base=createRecoveryIncident({payoutId:null,reason:RUNTIME_DRIFT_REASON,detail:incidentDetail(attestation),severity:'CRITICAL'})
    const incident={...base,source:RUNTIME_DRIFT_SOURCE,scope:'GLOBAL_FINANCIAL_MUTATION_HOLD',manualResolutionAllowed:false}
    store.put('recovery_incident',incident.id,incident,{action:'RUNTIME_DRIFT_INCIDENT_OPENED'})
    store.appendAudit('runtime_identity',incident.id,'RUNTIME_DRIFT_HOLD_OPENED',incident.detail)
    await notify({type:'OPENED',incident,attestation})
    return {state:'HOLD',incident,created:true}
  }

  let verified
  try{
    verified=verifyRuntimeAttestation(attestation,{secret,expectedCommitSha:attestation.identity.authorizedCommitSha,expectedImageDigest:attestation.identity.authorizedImageDigest})
  }catch(error){
    return {state:'HOLD',incident:active[0]||null,created:false,verificationError:String(error?.message||error)}
  }

  if(!active.length)return {state:'GREEN',incident:null,resolved:false}
  const resolved=[]
  for(const current of active){
    const incident={
      ...current,
      state:INCIDENT_STATES.RESOLVED,
      resolvedBy:'SYSTEM:runtime-identity-supervisor',
      resolvedAt:new Date().toISOString(),
      resolutionCode:'RUNTIME_IDENTITY_VERIFIED',
      resolutionNote:'Runtime commit and immutable image digest match the authorized deployment identity.',
      resolutionEvidence:{
        commitSha:verified.identity.buildCommitSha,
        imageDigest:verified.identity.runtimeImageDigest,
        environment:verified.identity.environment,
        attestedAt:verified.generatedAt
      }
    }
    store.put('recovery_incident',incident.id,incident,{action:'RUNTIME_DRIFT_INCIDENT_RESOLVED'})
    store.appendAudit('runtime_identity',incident.id,'RUNTIME_DRIFT_HOLD_RELEASED',incident.resolutionEvidence)
    await notify({type:'RESOLVED',incident,attestation})
    resolved.push(incident)
  }
  return {state:'GREEN',incident:resolved[0],resolved:true,count:resolved.length}
}
