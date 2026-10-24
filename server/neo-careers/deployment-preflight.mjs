/**
 * G035 deployment preflight: secret-free operator diagnostics.
 * Never accepts browser/user assertions as verification evidence.
 */
export function assessCareersDeployment({database,oidc,authorization,assets}={}){
 const requirements={
  dedicatedDatabase:database?.dedicatedProject===true && database?.privateAccessVerified===true,
  migration:database?.migrationApplied===true && database?.rowIsolationTestPassed===true,
  neoPass:oidc?.issuerVerified===true && oidc?.jwksSignatureVerified===true && oidc?.clientAudienceVerified===true && oidc?.callbackTestPassed===true,
  authorization:authorization?.workerIsolationPassed===true && authorization?.employerIsolationPassed===true && authorization?.nonceReplayTestPassed===true,
  assets:assets?.counterpartyIssuerVerified===true && assets?.bitcoinNetworkVerified===true
 }
 const pending=Object.entries(requirements).filter(([,passed])=>!passed).map(([name])=>name)
 return Object.freeze({requirements,pending,canEnableAuthenticatedCareersPortal:requirements.dedicatedDatabase&&requirements.migration&&requirements.neoPass&&requirements.authorization,canPublishVerifiedAssets:requirements.assets,canPayWorkers:false,canDistributeEquity:false})
}
