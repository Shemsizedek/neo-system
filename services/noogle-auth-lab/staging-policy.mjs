/** NSEC-030 preproduction gateway request policy. No remote operations. */
export function identityResponseHeaders() {
 return Object.freeze({
  'Cache-Control':'no-store, private',
  'Pragma':'no-cache',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
  'X-Frame-Options':'DENY',
  'Vary':'Authorization'
 });
}
export function ensureGuardianOrigin({origin, host, method='GET'}={}) {
 // HTTPS origin and RP ID are fixed, never selected by browser headers.
 const expected='https://connect.holytemples.org';
 if(host!=='connect.holytemples.org') return false;
 if(method!=='GET' && origin!==expected) return false;
 if(origin && origin!==expected) return false;
 return true;
}
export function stagingReadiness({tlsVerified=false,neoPassIntegrated=false,authenticatorTested=false,credentialPersistenceVerified=false}={}) {
 return Object.freeze({
  deployable:Boolean(tlsVerified&&neoPassIntegrated&&authenticatorTested&&credentialPersistenceVerified),
  terminalEnabled:false,
  enrollmentEnabled:false
 });
}
