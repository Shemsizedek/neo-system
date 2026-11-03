// NEO-OMARCHY-008 — fail-closed release/readiness inventory.
// Caller-supplied booleans are planning indicators, never production authority.
const REQUIREMENTS=Object.freeze([
  'stagingHostApproved','liveNEOpassIssuer','hardwareOwned',
  'actualDeviceAttested','realMtlSConnection','realDatabaseRestored',
  'liveOllamaInference','independentWitnessReviewed','operatorApproved',
  'financialCapabilitiesDisabled',
])
export function createMissionCertification(input={}) {
  const missing=REQUIREMENTS.filter(field=>input[field]!==true)
  return {
    gate:'NEO-OMARCHY-008',missionId:'neo:mission:omarchy-first-node',
    requirements:REQUIREMENTS.length,
    preliminaryIndications:REQUIREMENTS.length-missing.length,
    missing,
    readyForIndependentReview:missing.length===0,
    // An independent cryptographically verified, signed release record must
    // be produced by a separately authorized release authority before
    // promotion. This helper does not verify such records or emit one.
    promotable:false,productionReady:false,activated:false,
    issuerKeyApprovedByAuthority:false,
    financialOrWalletCapabilitiesEnabled:false,
    evidenceClass:'operator-supplied-preliminary-indicators',
  }
}
