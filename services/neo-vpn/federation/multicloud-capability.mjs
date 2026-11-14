// NEO-MULTICLOUD-001: pure, provider-neutral capability qualification.
// No API requests, cloud deployment, agent enrollment, route advertisement or keys.
// Caller-supplied evidence is a PROPOSAL, not independent host attestation.
import { canonicalNeoOverlay } from './provider-policy.mjs';

const BASE = Object.freeze({
  'render-web':       ['HTTPS_CONTROL', 'HTTP_APPLICATION'],
  'render-static':    ['STATIC_DOCUMENTATION'],
  'github-actions':   ['CI_DIAGNOSTICS', 'BUILD_ARTIFACTS'],
  'github-codespaces':['TEMPORARY_DEVELOPMENT'],
  'gitlab-ci':        ['CI_DIAGNOSTICS', 'BUILD_ARTIFACTS'],
  'neon-postgres':    ['DATABASE_STATE', 'AUDIT_STORAGE'],
  'vercel-functions': ['HTTPS_CONTROL', 'SERVERLESS_FUNCTION'],
  'ai-api':           ['INFERENCE_ANALYSIS'],
  'android-termux':  ['LOCAL_NETWORK_DIAGNOSTICS'],
  'netbird-client':   ['ENCRYPTED_CLIENT_PEER'],
  'dedicated-linux': ['POTENTIAL_ROUTING_PEER'],
});
const GATEWAY_CHECKS = Object.freeze([
  'operatorAuthorizationConfirmed',
  'machineOnlineIndependentlyObserved',
  'persistentPowerAndComputeVerified',
  'independentUplinkVerified',
  'usableKernelOrSupportedNetBirdTransportVerified',
  'networkResourceReachabilityVerified',
  'actualRecentEncryptedHandshakeObserved',
  'permittedPrivateTrafficVerified',
  'unauthorizedTrafficDenied',
  'revocationVerified',
  'approvedBudgetConfirmed',
  'failureDomainVerified'
]);

export function classifyPlatform(kind) {
  if (!Object.hasOwn(BASE, kind)) return {
    kind: 'UNRECOGNIZED',
    capabilities: [],
    standalone_vpn_gateway_supported: false,
    recommendation: 'REQUIRE_PROVIDER_CAPABILITY_AUDIT',
  };
  return {
    kind,
    capabilities: [...BASE[kind]],
    standalone_vpn_gateway_supported: kind === 'dedicated-linux' ? 'POTENTIAL_ONLY' : false,
    recommendation: kind === 'dedicated-linux'
      ? 'VERIFY_PHYSICAL_HOST_AND_PRIVILEGED_NETWORK_CONTROLS'
      : 'DO_NOT_TREAT_AS_STANDALONE_VPN_GATEWAY',
  };
}

export function qualifyGateway(candidate = {}) {
  const knownHost = candidate?.kind === 'dedicated-linux';
  const checks = knownHost && candidate?.evidence && typeof candidate.evidence === 'object'
    && !Array.isArray(candidate.evidence) ? candidate.evidence : {};
  const flags = knownHost ? GATEWAY_CHECKS.filter(k => checks[k] !== true)
    .map(k => 'UNVERIFIED_' + k.replace(/[A-Z]/g, c=>'_'+c).toUpperCase()) :
    ['NOT_A_DEDICATED_OPERATOR_CONTROLLED_HOST'];
  return {
    classification: knownHost ? 'DEDICATED_HOST_CANDIDATE' : 'NON_GATEWAY_SURFACE',
    proposed_checks_met: knownHost ? GATEWAY_CHECKS.length - flags.length : 0,
    proposed_checks_required: GATEWAY_CHECKS.length,
    assessment: flags.length ? 'HOLD_NOT_QUALIFIED' : 'SELF_REPORTED_READY_FOR_INDEPENDENT_MANUAL_REVIEW',
    missing_evidence: flags,
    independent_acceptance_attested: false,
    gateway_live_certified: false,
    access_control_live_certified: false,
    production_route_authorized: false,
  };
}

export function proposeFederation({surfaces = [], candidates = []} = {}) {
  if (!Array.isArray(surfaces) || !Array.isArray(candidates) ||
    surfaces.length > 100 || candidates.length > 25) {
    throw new TypeError('INVALID_FEDERATION_INVENTORY');
  }
  const capabilityCounts = {};
  for (const kind of surfaces) {
    const classification = classifyPlatform(kind);
    for (const role of classification.capabilities) {
      capabilityCounts[role] = (capabilityCounts[role] || 0) + 1;
    }
  }
  const evaluations = candidates.map(qualifyGateway);
  const provisional = evaluations.filter(x =>
    x.assessment === 'SELF_REPORTED_READY_FOR_INDEPENDENT_MANUAL_REVIEW').length;
  return {
    schema: 'neo.multicloud.001.provider-capability.v1',
    source: 'UNVERIFIED_OPERATOR_INVENTORY',
    canonical_private_network: canonicalNeoOverlay,
    network_roles: capabilityCounts,
    gateway_candidates_review_eligible_by_self_report: provisional,
    gateway_candidates_on_hold: candidates.length - provisional,
    redundancy: 'NOT_ATTESTED',
    failover: 'NOT_ATTESTED',
    encrypted_transport: 'NOT_ATTESTED',
    bandwidth_bonding: 'NOT_CONFIGURED',
    platform_failover_action: 'NONE',
    production_status: 'HOLD_PENDING_INDEPENDENT_PHYSICAL_GATEWAY_AND_TWO_PEER_EVIDENCE',
    deployment_performed: false,
  };
}
