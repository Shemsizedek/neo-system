import fs from 'node:fs'

export function loadPolicy(path='services/neo-discord/deployment/runtime-policy.json'){
  return JSON.parse(fs.readFileSync(path,'utf8'))
}

export function validatePolicy(policy){
  const errors=[]
  if(policy?.service!=='neo-discord')errors.push('service must be neo-discord')
  if(policy?.sourceOfTruth!=='github')errors.push('sourceOfTruth must be github')
  if(policy?.controlPlane!=='discord')errors.push('controlPlane must be discord')
  const primary=policy?.adapters?.[policy?.primaryAdapter]
  const standby=policy?.adapters?.[policy?.standbyAdapter]
  if(!primary)errors.push('primary adapter is missing')
  if(!standby)errors.push('standby adapter is missing')
  if(primary?.role!=='primary')errors.push('primary adapter role must be primary')
  if(standby?.role!=='standby')errors.push('standby adapter role must be standby')
  if(policy?.failover?.automaticPromotion!==false)errors.push('automatic promotion must remain disabled')
  if(policy?.failover?.mayChangeAuthorizationPolicy!==false)errors.push('failover may not change authorization policy')
  if(policy?.failover?.mayEnableSensitiveExecution!==false)errors.push('failover may not enable sensitive execution')
  if(policy?.failover?.mayApproveIntents!==false)errors.push('failover may not approve intents')
  return errors
}

export function healthIsAcceptable(policy,health){
  const required=policy?.healthPolicy?.required||{}
  return Object.entries(required).every(([key,value])=>health?.[key]===value)
}

export function promotionDecision(policy,{targetAdapter,health,parityPassed=false,explicitDispatch=false}={}){
  const errors=validatePolicy(policy)
  if(errors.length)return {allowed:false,reasons:errors}
  const reasons=[]
  const target=policy.adapters?.[targetAdapter]
  if(!target)reasons.push('target adapter is not declared')
  if(targetAdapter!==policy.standbyAdapter)reasons.push('target must be the declared standby adapter')
  if(policy.failover?.requiresStandbyDeployed&&target?.deployed!==true)reasons.push('standby adapter is not marked deployed')
  if(policy.failover?.requiresHealthyStandby&&!healthIsAcceptable(policy,health))reasons.push('standby health response does not satisfy policy')
  if(policy.failover?.requiresAdapterParityCI&&parityPassed!==true)reasons.push('adapter parity CI has not been affirmed')
  if(policy.failover?.requiresExplicitGitHubWorkflowDispatch&&explicitDispatch!==true)reasons.push('explicit workflow dispatch is required')
  return {allowed:reasons.length===0,reasons}
}

if(import.meta.url===`file://${process.argv[1]}`){
  const policy=loadPolicy(process.argv[2])
  const errors=validatePolicy(policy)
  if(errors.length){
    for(const error of errors)console.error(error)
    process.exit(1)
  }
  console.log(`Runtime policy valid: ${policy.primaryAdapter} -> ${policy.standbyAdapter}`)
}
