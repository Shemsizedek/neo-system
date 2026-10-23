// KI-016 — independent KNOWINDEX membership authority.
// The signed JWT proves a subject, never a curator role. Authoritative registry
// state and separately approved subject allowlists decide moderation privileges.
// Unlike the wider portal's optional executive bootstrap, this service does not
// accept a role/email from token claims or allow registry-unavailable fallback.
const privilegedRoles = new Set(['curator', 'executive-admin']);
const safeSubject = value => typeof value === 'string' &&
  value.length > 7 && value.length <= 256 && /^[a-z][a-z0-9_-]*:[^\s\x00-\x1f]+$/i.test(value);
const safeEmail = value => typeof value === 'string' && value.length <= 320 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const createAllowlist = (items, field) => {
  if (!Array.isArray(items) || items.some(v => !safeSubject(v))) {
    throw new TypeError('knowindex_invalid_' + field);
  }
  return new Set(items);
};

export function createKnowindexNeopassAuthority({
  registry,
  approvedCurators = [],
  approvedExecutives = [],
  executiveEmail = null
} = {}) {
  if (typeof registry?.getNEOpassCredential !== 'function') throw new Error('knowindex_registry_required');
  const curators = createAllowlist(approvedCurators, 'curators');
  const executives = createAllowlist(approvedExecutives, 'executives');
  if (executives.size > 0 && !safeEmail(executiveEmail)) throw new Error('knowindex_executive_identity_not_pinned');

  const session = async (subject, _untrustedClaims = {}) => {
    if (!safeSubject(subject)) return null;

    // A signing-key compromise or signed role claim alone is not role approval.
    // Read through the configured authoritative registry on EVERY request:
    // no stale cache, signed-token role override or emergency bootstrap.
    const record = await registry.getNEOpassCredential(subject);
    if (!record || record.subject !== subject ||
        record.status !== 'active' ||
        typeof record.role !== 'string') {
      return null;
    }

    if (record.provider === 'google') {
      if (!subject.startsWith('google:') ||
          !record.providerSubject ||
          subject !== 'google:' + record.providerSubject ||
          !safeEmail(record.email)) return null;
    } else if (record.provider !== 'local') {
      // This boundary intentionally does not approve unknown identity providers.
      return null;
    }

    let role = 'member';
    if (record.role === 'curator' && curators.has(subject) && record.provider === 'google') {
      role = 'curator';
    }
    if (record.role === 'executive-admin' &&
        executives.has(subject) &&
        record.provider === 'google' &&
        safeEmail(executiveEmail) &&
        record.email.toLowerCase() === executiveEmail.toLowerCase()) {
      role = 'executive-admin';
    }

    return { subject, role, neopassStatus: 'active' };
  };

  return Object.freeze({
    session,
    // Readiness is structural only; it does NOT certify live Firestore IAM,
    // active tokens, signing-key ownership, backup or approved user access.
    inspectConfiguration() {
      return Object.freeze({
        identitySource: 'authoritative-neopass-registry',
        tokenClaimRolesTrusted: false,
        executiveBootstrapAllowed: false,
        anonymousFallbackAllowed: false,
        approvedCuratorCount: curators.size,
        approvedExecutiveCount: executives.size,
        roleEligibility: 'registry-and-operator-allowlist'
      });
    }
  });
}
