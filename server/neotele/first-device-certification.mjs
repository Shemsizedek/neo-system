// NTEL-024 — Certification decision for a specific commit and build artifact.
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
export function assessFirstDeviceRelease({expectedCommit,build,tests,device}={}){
 const checks={
  commit:typeof expectedCommit==='string'&&SHA.test(expectedCommit),
  androidBuild:build?.conclusion==='success'&&build?.commit===expectedCommit,
  apkDigest:typeof build?.apkSha256==='string'&&DIGEST.test(build.apkSha256),
  tests:tests?.conclusion==='success'&&tests?.commit===expectedCommit,
  localConsent:device?.consentConfirmed===true,
  installedBuild:device?.installedApkSha256===build?.apkSha256&&typeof device?.installedApkSha256==='string',
  deviceDiagnostics:device?.localDiagnosticsVerified===true
 };
 const buildCertified=checks.commit&&checks.androidBuild&&checks.apkDigest&&checks.tests;
 const devicePilotVerified=buildCertified&&checks.localConsent&&checks.installedBuild&&checks.deviceDiagnostics;
 return Object.freeze({checks,buildCertified,devicePilotVerified,
   readyForSupervisedDebugPilot:buildCertified,
   productionReady:false,remoteTerminalEnabled:false,liveEsimProvisioningEnabled:false,
   entitlementPublished:false});
}
