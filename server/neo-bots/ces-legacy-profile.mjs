export const CES_LEGACY_PROFILE = Object.freeze({
  id: 'ces-legacy',
  baseUrl: 'https://www.community-exchange.org',
  default: true,
  routes: Object.freeze({
    virtualTrader: Object.freeze({
      key: 'virtual-trader',
      path: '/win/virtual.asp',
      method: 'GET',
      mode: 'read-only',
      pageMarkers: ['Virtual Trader'],
    }),
    transactionReview: Object.freeze({
      key: 'transaction-review',
      path: null,
      method: 'GET',
      mode: 'discovery-required',
      pageMarkers: [],
    }),
    transactionApproval: Object.freeze({
      key: 'transaction-approval',
      path: null,
      method: 'POST',
      mode: 'guarded',
      requiresHumanApproval: true,
      requiresFingerprint: true,
    }),
    vDollarIssue: Object.freeze({
      key: 'v-dollar-issue',
      path: null,
      method: 'POST',
      mode: 'guarded',
      requiresHumanApproval: true,
      requiresFingerprint: true,
    }),
    publicationUpload: Object.freeze({
      key: 'publication-upload',
      path: null,
      method: 'POST',
      mode: 'guarded',
      requiresHumanApproval: true,
      requiresFingerprint: true,
    }),
    subscriptionMaintain: Object.freeze({
      key: 'subscription-maintain',
      path: null,
      method: 'POST',
      mode: 'guarded',
      requiresHumanApproval: true,
      requiresFingerprint: true,
    }),
  }),
});

export function getLegacyCesRoute(key) {
  const route = Object.values(CES_LEGACY_PROFILE.routes).find((candidate) => candidate.key === key);
  if (!route) throw new Error(`unknown CES legacy route: ${key}`);
  return route;
}

export function assertLegacyRouteReady(key, { fingerprint } = {}) {
  const route = getLegacyCesRoute(key);
  if (!route.path) throw new Error(`CES legacy route requires discovery: ${key}`);
  if (route.requiresFingerprint && !fingerprint) throw new Error(`CES legacy route requires reviewed fingerprint: ${key}`);
  return route;
}

export function registerDiscoveredLegacyRoute(profile, key, { path, fingerprint, pageMarkers = [] }) {
  if (!profile?.routes) throw new Error('CES legacy profile is required');
  if (!path) throw new Error('discovered legacy path is required');
  const current = Object.values(profile.routes).find((candidate) => candidate.key === key);
  if (!current) throw new Error(`unknown CES legacy route: ${key}`);
  if (current.requiresFingerprint && !fingerprint) throw new Error(`reviewed fingerprint is required for ${key}`);
  return Object.freeze({ ...current, path, fingerprint: fingerprint || null, pageMarkers: [...pageMarkers] });
}
