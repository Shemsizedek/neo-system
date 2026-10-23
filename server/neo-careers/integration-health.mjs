/** G031 deployment readiness. Only explicit evidence marks a dependency ready. */
export function assessCareersIntegration({database={},identity={},bitcoin={},registry={}}={}){
 const checks={
  database:database.connectionTestPassed===true && database.migrationsApplied===true && database.tenantIsolationVerified===true,
  identity:identity.issuerVerified===true && identity.tokenSignatureVerified===true && identity.audienceVerified===true && identity.replayProtectionVerified===true,
  bitcoin:bitcoin.trustedNodeConnected===true && bitcoin.networkVerified===true && bitcoin.confirmationTestPassed===true,
  registry:registry.counterpartyIssuanceVerified===true && registry.issuerMatched===true
 }
 const pending=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name)
 return Object.freeze({checks:Object.freeze(checks),pending,readyForAuthenticatedReadOnlyStaging:checks.database&&checks.identity,readyForVerifiedAssetDisplay:checks.bitcoin&&checks.registry,signingEnabled:false,payrollEnabled:false})
}
export function careersEnvironmentChecklist(env={}){
 const required=['NEO_CAREERS_DATABASE_URL','NEO_CAREERS_OIDC_ISSUER','NEO_CAREERS_OIDC_AUDIENCE','NEO_CAREERS_OIDC_JWKS_URL']
 const missing=required.filter(x=>typeof env[x]!=='string'||!env[x].trim())
 const publicValues=['NEO_CAREERS_OIDC_ISSUER','NEO_CAREERS_OIDC_JWKS_URL']
 const invalid=publicValues.filter(k=>typeof env[k]==='string'&&!env[k].startsWith('https://'))
 return Object.freeze({configured:missing.length===0&&invalid.length===0,missing,invalid,connectionTested:false,secretsExposed:false})
}
