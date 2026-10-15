// NSEC-115: security readiness discovery. No tokens, user IDs or credentials exposed.
// This is diagnostic only, never an enrollment or authentication grant.
export function createConnectReadiness({getIssuerStatus,getDatabaseStatus}) {
 if(typeof getIssuerStatus!=='function'||typeof getDatabaseStatus!=='function')throw Error('readiness_dependencies_required');
 return async function status() {
  const [issuer,database]=await Promise.allSettled([getIssuerStatus(),getDatabaseStatus()]);
  const issuerReady=issuer.status==='fulfilled'&&issuer.value===true;
  const databaseReady=database.status==='fulfilled'&&database.value===true;
  return Object.freeze({
   mode:'enrollment-disabled',
   issuerVerified:issuerReady,
   durableStoreReady:databaseReady,
   webauthnRegistrationEnabled:false,
   persistentDeviceEnrollmentEnabled:false,
   deviceControlEnabled:false,
   requirements:['verified-neopass-issuer','durable-postgresql','audited-webauthn-registration','device-bound-authorization']
  });
 };
}
