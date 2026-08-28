export const FOUNDER_SUBJECT_ID = 'neo:founder:000001';

export const founderPrincipal = Object.freeze({
  subject_id: FOUNDER_SUBJECT_ID,
  ordinal: 1,
  account_class: 'founder',
  bootstrap_role: 'founder_owner',
  reserved: true,
  deletable: false,
  recyclable: false,
  authentication_bypass: false,
});

export function assertFounderInvariant(record) {
  if (!record || typeof record !== 'object') throw new TypeError('Founder record is required');
  const failures = [];
  if (record.subject_id !== FOUNDER_SUBJECT_ID) failures.push('subject_id');
  if (record.ordinal !== 1) failures.push('ordinal');
  if (record.account_class !== 'founder') failures.push('account_class');
  if (record.bootstrap_role !== 'founder_owner') failures.push('bootstrap_role');
  if (record.reserved !== true) failures.push('reserved');
  if (record.deletable !== false) failures.push('deletable');
  if (record.recyclable !== false) failures.push('recyclable');
  if (record.authentication_bypass !== false) failures.push('authentication_bypass');
  if (failures.length) throw new Error(`Founder invariant violation: ${failures.join(', ')}`);
  return true;
}

/**
 * Idempotently creates or validates the canonical founder principal.
 * Adapter contract:
 *   findBySubject(subjectId) -> record|null
 *   insert(record) -> persisted record
 */
export async function bootstrapFounderAccount(adapter, profile = {}) {
  if (!adapter || typeof adapter.findBySubject !== 'function' || typeof adapter.insert !== 'function') {
    throw new TypeError('Identity adapter must implement findBySubject and insert');
  }

  const existing = await adapter.findBySubject(FOUNDER_SUBJECT_ID);
  if (existing) {
    assertFounderInvariant(existing);
    return { created: false, principal: existing };
  }

  const record = {
    ...founderPrincipal,
    profile: {
      display_name: profile.display_name ?? 'NEO Founder',
      handle: profile.handle ?? null,
    },
    created_at: new Date().toISOString(),
  };

  const persisted = await adapter.insert(record);
  assertFounderInvariant(persisted);
  return { created: true, principal: persisted };
}

export function canDeletePrincipal(principal) {
  return principal?.subject_id === FOUNDER_SUBJECT_ID ? false : principal?.deletable !== false;
}

export function requiresStepUp(action) {
  return new Set(['delete_account', 'rotate_signing_key', 'change_owner', 'export_secrets', 'disable_mfa']).has(action);
}
