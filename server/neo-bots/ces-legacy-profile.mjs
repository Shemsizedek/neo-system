export const CES_LEGACY_PROFILE = Object.freeze({
  id: 'ces-legacy',
  baseUrl: 'https://www.community-exchange.org',
  default: true,
  surfaces: Object.freeze({
    login: Object.freeze({ key: 'login', label: 'Legacy Login', risk: 'authentication', mapping: 'discovery-required' }),
    transactions: Object.freeze({ key: 'transactions', label: 'Transactions', risk: 'financial', mapping: 'discovery-required' }),
    offerings: Object.freeze({ key: 'offerings', label: 'Offerings', risk: 'market-data', mapping: 'discovery-required' }),
    publications: Object.freeze({ key: 'publications', label: 'Publications', risk: 'content-write', mapping: 'discovery-required' }),
    memberships: Object.freeze({ key: 'memberships', label: 'Memberships', risk: 'account-admin', mapping: 'discovery-required' }),
    manage: Object.freeze({ key: 'manage', label: 'Manage', risk: 'admin', mapping: 'discovery-required' }),
    stats: Object.freeze({ key: 'stats', label: 'Stats', risk: 'read-only', mapping: 'discovery-required' }),
    virtualTrader: Object.freeze({ key: 'virtual-trader', label: 'Virtual Trader', risk: 'interexchange', mapping: 'mapped' }),
  }),
  routes: Object.freeze({
    virtualTrader: Object.freeze({ key: 'virtual-trader', surface: 'virtual-trader', path: '/win/virtual.asp', method: 'GET', mode: 'read-only', pageMarkers: ['Virtual Trader'] }),
    transactionReview: Object.freeze({ key: 'transaction-review', surface: 'transactions', path: null, method: 'GET', mode: 'discovery-required', pageMarkers: [] }),
    transactionApproval: Object.freeze({ key: 'transaction-approval', surface: 'transactions', path: null, method: 'POST', mode: 'guarded', requiresHumanApproval: true, requiresFingerprint: true }),
    vDollarIssue: Object.freeze({ key: 'v-dollar-issue', surface: 'manage', path: null, method: 'POST', mode: 'guarded', requiresHumanApproval: true, requiresFingerprint: true }),
    publicationUpload: Object.freeze({ key: 'publication-upload', surface: 'publications', path: null, method: 'POST', mode: 'guarded', requiresHumanApproval: true, requiresFingerprint: true }),
    subscriptionMaintain: Object.freeze({ key: 'subscription-maintain', surface: 'memberships', path: null, method: 'POST', mode: 'guarded', requiresHumanApproval: true, requiresFingerprint: true }),
    offeringsRead: Object.freeze({ key: 'offerings-read', surface: 'offerings', path: null, method: 'GET', mode: 'discovery-required' }),
    statsRead: Object.freeze({ key: 'stats-read', surface: 'stats', path: null, method: 'GET', mode: 'discovery-required' }),
    manageRead: Object.freeze({ key: 'manage-read', surface: 'manage', path: null, method: 'GET', mode: 'discovery-required' }),
  }),
});

export function getLegacyCesSurface(key) {
  const surface = Object.values(CES_LEGACY_PROFILE.surfaces).find((candidate) => candidate.key === key);
  if (!surface) throw new Error(`unknown CES legacy surface: ${key}`);
  return surface;
}

export function getLegacyCesRoute(key) {
  const route = Object.values(CES_LEGACY_PROFILE.routes).find((candidate) => candidate.key === key);
  if (!route) throw new Error(`unknown CES legacy route: ${key}`);
  return route;
}

export function listLegacyDiscoveryTargets() {
  return Object.values(CES_LEGACY_PROFILE.surfaces).map((surface) => ({
    ...surface,
    routes: Object.values(CES_LEGACY_PROFILE.routes).filter((route) => route.surface === surface.key).map((route) => route.key),
  }));
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

export function createTrustedLegacyProfile({ exchangeId, trustedRoutes = {} } = {}) {
  if (!exchangeId) throw new Error('exchangeId is required');
  const routes = {};
  for (const [name, route] of Object.entries(CES_LEGACY_PROFILE.routes)) {
    const promoted = trustedRoutes[route.surface];
    if (!promoted) {
      routes[name] = route;
      continue;
    }
    if (promoted.trusted !== true || !promoted.reviewRecord?.reviewer) {
      throw new Error(`untrusted CES legacy promotion for ${route.surface}`);
    }
    routes[name] = Object.freeze({
      ...route,
      path: route.path || promoted.path,
      discovery: Object.freeze({
        source: promoted.source,
        confidence: promoted.confidence,
        score: promoted.score,
        reviewer: promoted.reviewRecord.reviewer,
        reviewedAt: promoted.reviewRecord.reviewedAt,
      }),
    });
  }
  return Object.freeze({
    ...CES_LEGACY_PROFILE,
    exchangeId: String(exchangeId).toUpperCase(),
    routes: Object.freeze(routes),
  });
}
