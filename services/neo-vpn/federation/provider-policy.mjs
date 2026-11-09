// NET-007 pure policy planner. It NEVER creates an account, server or tunnel.
// Actual provider onboarding and credential handling must run on an authorized
// device/operator account. NEO's 10.144.0.0/16 is an independent routed segment.
import { readFileSync } from 'node:fs';

export const canonicalNeoOverlay = '10.144.0.0/16';

export function loadProviderPolicy() {
  return JSON.parse(readFileSync(new URL('../../../architecture/global-neo-ip-provider-policy.json', import.meta.url), 'utf8'));
}

function verifiedState(item) {
  return Boolean(item && item.accountAuthorized === true &&
    item.termsAccepted === true && item.zeroAdditionalCostConfirmed === true &&
    item.transportEncryptionVerified === true &&
    item.accessPolicyVerified === true && item.revocationVerified === true &&
    item.independentPeersVerified === true &&
    item.reachable === true && item.active === true &&
    item.quotaExhausted !== true && item.paymentRequired !== true);
}

export function candidateAssessment(policy, evidenceById = {}) {
  if (policy?.canonical_neo_private_overlay !== canonicalNeoOverlay) {
    throw new Error('neo_overlay_must_remain_10_144');
  }
  return [...policy.candidates]
    .sort((a,b) => a.priority - b.priority)
    .map(p => ({
      id: p.id,
      priority: p.priority,
      configured: p.approval_state === 'ACTIVE', // static candidate registry defaults NOT active
      evidenceQualified: verifiedState(evidenceById[p.id]),
      decision: verifiedState(evidenceById[p.id]) ? 'QUALIFIED_BY_SUPPLIED_EVIDENCE' : 'NOT_VERIFIED',
      // Never assert actual provider connectivity without an independent network probe.
      liveConnectionCertified: false
    }));
}

export function planProviderSwitch({
  policy,
  currentProviderId = null,
  event = 'commission',
  evidenceById = {},
  migrationAuthorized = false
} = {}) {
  const allowedEvents = ['commission', 'provider_unavailable', 'quota_exhausted', 'gateway_unhealthy'];
  if (!allowedEvents.includes(event)) throw new Error('unsupported_provider_switch_event');
  const assessments = candidateAssessment(policy, evidenceById);
  const qualified = assessments.filter(x => x.evidenceQualified && x.id !== currentProviderId);
  if (qualified.length === 0) {
    const candidates = assessments.filter(x => x.id !== currentProviderId).map(x=>x.id);
    return {
      state: 'BLOCKED_NO_VERIFIED_STANDBY',
      current_provider: currentProviderId,
      recommended_candidate_order: candidates,
      next_action: 'Authorize and enroll a real device on an eligible no-cost provider; do not rotate accounts or bypass paid usage limits.',
      requires_independent_acceptance: true,
      live_network_claim: false
    };
  }
  const next = qualified[0];
  if (!migrationAuthorized) return {
    state: 'REVIEW_REQUIRED',
    current_provider: currentProviderId,
    proposed_provider: next.id,
    next_action: 'Obtain operator approval and perform full client re-enrollment and negative ACL tests before cutover.',
    live_network_claim: false
  };
  return {
    state: 'AUTHORIZED_CUTOVER_PLAN_ONLY',
    current_provider: currentProviderId,
    proposed_provider: next.id,
    action: 'STAGE_VALIDATE_THEN_EXPLICITLY_CUT_OVER',
    note: 'This planner performs no network mutation and does not bypass provider pricing or terms.',
    live_network_claim: false
  };
}

export function classifyNeoIpEvidence({
  netbirdPeerIp,
  neoRoutedSubnetVerified = false,
  routeAclVerified = false,
  independentGatewayVerified = false
} = {}) {
  const providerOverlay = typeof netbirdPeerIp === 'string' && /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.(?:\d{1,3})\.(?:\d{1,3})$/.test(netbirdPeerIp);
  return {
    netbird_provider_overlay: providerOverlay ? 'CGNAT_PEER_IP' : 'NOT_VERIFIED',
    neo_overlay: canonicalNeoOverlay,
    neo_private_subnet_reachable: Boolean(neoRoutedSubnetVerified && routeAclVerified && independentGatewayVerified),
    public_routable_ip_allocated: false,
    note: 'The NetBird 100.64/10 overlay must not be represented as a NEO 10.144/16 assignment.'
  };
}
