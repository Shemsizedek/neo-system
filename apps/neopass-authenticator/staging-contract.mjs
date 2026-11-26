// NEO Key staging integration contract. No HTTP routes, tokens, or privileges.
const operations = Object.freeze({
  registrationOptions:'/api/neopass/authenticator/registration/options',
  registrationVerify:'/api/neopass/authenticator/registration/verify',
  authenticationOptions:'/api/neopass/authenticator/authentication/options',
  authenticationVerify:'/api/neopass/authenticator/authentication/verify'
});
export function inspectStagingReadiness(input, expectedOrigin) {
  if (!input || typeof input!=='object' || Array.isArray(input) ||
      input.version!==1 || input.environment!=='isolated-staging' ||
      input.ready!==true || input.registrationEnabled!==true ||
      input.authenticationEnabled!==true ||
      input.independentSecurityReviewApproved!==true ||
      input.serverEnforcesCsrf!==true ||
      input.serverEnforcesRateLimits!==true ||
      input.durableChallengeStoreReady!==true ||
      input.verifiedIssuerReady!==true ||
      input.hardwareTestCertified!==true ||
      typeof expectedOrigin!=='string' || !expectedOrigin.startsWith('https://') ||
      input.origin!==expectedOrigin ||
      typeof input.rpId!=='string' || input.origin!==`https://${input.rpId}` ||
      input.contract!=='neo-key-staging-v1') {
    return Object.freeze({ready:false,reason:'staging_not_certified'});
  }
  return Object.freeze({ready:true,operations});
}
// Readiness is advisory only. Never authorize access or activate enrollment based
// on a public JSON response: the protected server MUST enforce every control.
export const STAGING_OPERATIONS = operations;
