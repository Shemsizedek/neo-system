// NET-008: pure, redacted read-only Cloud mesh readiness assessment.
// A management API response NEVER proves independent device control,
// an actual WireGuard handshake, application ACL enforcement or NEO subnet routing.
const minutes10 = 10 * 60 * 1000;
const parseTime = s => {
  const v=Date.parse(String(s || ''));
  return Number.isFinite(v) ? v : NaN;
};

function isFreshPeer(peer, nowMs) {
  const seen=parseTime(peer?.last_seen);
  return peer?.connected === true && Number.isFinite(seen) &&
    seen <= nowMs + 60 * 1000 && (nowMs - seen) >= 0 &&
    (nowMs - seen) <= minutes10 &&
    peer?.approval_required !== true && peer?.login_expired !== true;
}

function potentiallyBroadDefaultPolicy(policy) {
  if (policy?.enabled !== true) return false;
  if (!Array.isArray(policy.rules)) return true; // uncertain, fail closed
  const hasAccept=policy.rules.some(r=>r?.enabled !== false && r?.action === 'accept');
  if (!hasAccept) return false;
  return /^default(?: policy)?$/i.test(String(policy.name || '').trim()) ||
    policy.rules.some(r=>r?.enabled !== false && r?.action === 'accept' &&
      /^default(?: policy)?$/i.test(String(r.name || '').trim()));
}

export function evaluatePilotReadiness({peers,policies,observedAt}={}) {
  if (!Array.isArray(peers) || !Array.isArray(policies)) {
    throw new TypeError('netbird_read_only_inventory_unavailable');
  }
  const nowMs=Date.parse(observedAt || new Date().toISOString());
  if (!Number.isFinite(nowMs)) throw new TypeError('invalid_observation_time');
  const eligible=peers.filter(p=>isFreshPeer(p,nowMs));
  const eligibleIds=new Set(eligible.map(x=>x.id).filter(Boolean));
  const uniqueOwners=new Set(eligible.map(x=>x.user_id).filter(Boolean));
  const hasDefault=policies.some(p=>potentiallyBroadDefaultPolicy(p));
  const activePolicyCount=policies.filter(p=>p?.enabled === true).length;
  const blockers=[];
  if (eligibleIds.size < 2) blockers.push('TWO_RECENT_AUTHORIZED_CONNECTED_PEERS_NOT_OBSERVED');
  if (uniqueOwners.size < 2) blockers.push('TWO_DISTINCT_OPERATOR_IDENTITIES_NOT_OBSERVED');
  if (hasDefault) blockers.push('POTENTIALLY_BROAD_DEFAULT_ACCESS_POLICY_ENABLED');
  if (!activePolicyCount) blockers.push('NO_ACTIVE_ACCESS_POLICY_OBSERVED');
  blockers.push('DEVICE_OWNERSHIP_HANDSHAKE_AND_NEGATIVE_ACL_TESTS_NOT_ATTESTED');
  blockers.push('REVOCATION_AND_APP_SESSION_TESTS_NOT_ATTESTED');
  blockers.push('NEO_10_144_ROUTE_NOT_ATTESTED');
  return {
    schema:'global-neo-ip.net008.cloud-observation.v1',
    observed_at:new Date(nowMs).toISOString(),
    source:'NETBIRD_CLOUD_READ_ONLY',
    inventory_authenticated:true,
    registered_peer_count:peers.length,
    recent_connected_approved_peer_count:eligibleIds.size,
    distinct_user_id_count_for_recent_peers:uniqueOwners.size,
    active_access_policy_count:activePolicyCount,
    potentially_broad_default_policy_enabled:hasDefault,
    flags:blockers,
    // These three cannot be established by NetBird's management API alone.
    live_wireguard_handshake_accepted:false,
    neo_private_network_routing_accepted:false,
    two_device_production_acceptance:false,
    production_status:'HOLD_PENDING_DEVICE_AND_POLICY_ACCEPTANCE'
  };
}

export function failClosedPilotReport(reason='NETBIRD_CONNECTION_UNVERIFIED') {
  return {
    schema:'global-neo-ip.net008.cloud-observation.v1',
    source:'NETBIRD_CLOUD_READ_ONLY',
    inventory_authenticated:false,
    flags:[reason],
    live_wireguard_handshake_accepted:false,
    neo_private_network_routing_accepted:false,
    two_device_production_acceptance:false,
    production_status:'HOLD_UNVERIFIED'
  };
}
