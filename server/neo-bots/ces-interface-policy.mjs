export const CES_INTERFACE_MODES = Object.freeze({
  LEGACY: 'legacy',
  MODERN: 'modern',
});

export const CES_OPERATION_POLICY = Object.freeze({
  'ces.transactions.review': { preferred: 'legacy', modernAllowed: true, risk: 'read-only' },
  'ces.transactions.approve': { preferred: 'legacy', modernAllowed: false, risk: 'value-movement' },
  'ces.vdollars.issue': { preferred: 'legacy', modernAllowed: false, risk: 'value-movement' },
  'ces.publications.upload': { preferred: 'legacy', modernAllowed: true, risk: 'write' },
  'ces.subscriptions.maintain': { preferred: 'legacy', modernAllowed: true, risk: 'write' },
  'ces.virtual-trader.review': { preferred: 'legacy', modernAllowed: true, risk: 'read-only' },
  'ces.interexchange.settlement.review': { preferred: 'legacy', modernAllowed: true, risk: 'read-only' },
});

export function resolveCesInterface(action, requestedMode) {
  const policy = CES_OPERATION_POLICY[action];
  if (!policy) throw new Error(`unregistered CES operation: ${action}`);

  const requested = requestedMode ? String(requestedMode).toLowerCase() : null;
  if (!requested) return policy.preferred;
  if (!Object.values(CES_INTERFACE_MODES).includes(requested)) {
    throw new Error(`unsupported CES interface mode: ${requested}`);
  }
  if (requested === CES_INTERFACE_MODES.MODERN && !policy.modernAllowed) {
    throw new Error(`CES modern interface is not permitted for ${action}; legacy interface required`);
  }
  return requested;
}

export function isLegacyCritical(action) {
  const policy = CES_OPERATION_POLICY[action];
  return Boolean(policy && policy.preferred === CES_INTERFACE_MODES.LEGACY && !policy.modernAllowed);
}
