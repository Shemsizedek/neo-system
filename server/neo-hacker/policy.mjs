export const AUTONOMY = Object.freeze({
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  ORANGE: 'ORANGE',
  RED: 'RED'
});

const RED_ACTIONS = new Set([
  'delete-production-data',
  'change-persistent-privilege',
  'install-persistence',
  'export-credentials',
  'sign-financial-transaction',
  'attack-third-party',
  'disable-audit-logging'
]);

const ORANGE_ACTIONS = new Set([
  'authorized-vulnerability-scan',
  'authorized-api-fuzz',
  'authorized-sandbox-exploit-test',
  'authenticated-configuration-audit'
]);

const YELLOW_ACTIONS = new Set([
  'quarantine-content',
  'terminate-suspicious-child-process',
  'revoke-temporary-token',
  'block-known-malicious-destination'
]);

export function classifyAction(action) {
  if (RED_ACTIONS.has(action)) return AUTONOMY.RED;
  if (ORANGE_ACTIONS.has(action)) return AUTONOMY.ORANGE;
  if (YELLOW_ACTIONS.has(action)) return AUTONOMY.YELLOW;
  return AUTONOMY.GREEN;
}

export function authorizeAction({ action, target = {}, humanApproved = false } = {}) {
  const tier = classifyAction(action);
  const targetAuthorized = target.neoOwned === true || target.explicitAuthorization === true;

  if (tier === AUTONOMY.RED) {
    return { allowed: humanApproved && targetAuthorized, tier, reason: humanApproved ? 'red-action-target-check' : 'human-approval-required' };
  }

  if (tier === AUTONOMY.ORANGE) {
    return { allowed: targetAuthorized, tier, reason: targetAuthorized ? 'authorized-target' : 'target-authorization-required' };
  }

  return { allowed: true, tier, reason: 'policy-permitted' };
}

export function evaluateToolRequest(request = {}) {
  const auth = authorizeAction(request);
  if (request.untrustedInstruction === true && auth.tier !== AUTONOMY.GREEN) {
    return { ...auth, allowed: false, reason: 'untrusted-content-cannot-authorize-tool-action' };
  }
  return auth;
}
