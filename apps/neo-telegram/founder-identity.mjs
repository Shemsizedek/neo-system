export const FOUNDER_SUBJECT = 'neo:founder:000001';
export const FOUNDER_ACCOUNT_ORDINAL = 1;
export const FOUNDER_ROLE = 'founder_owner';

export function founderEnrollmentState(configuredPublicKey = '') {
  return Object.freeze({
    subjectId: FOUNDER_SUBJECT,
    accountOrdinal: FOUNDER_ACCOUNT_ORDINAL,
    role: FOUNDER_ROLE,
    reserved: true,
    verifiedEnrollmentRequired: true,
    authenticationBypass: false,
    messageSigningBypass: false,
    configured: Boolean(configuredPublicKey)
  });
}

export function authorizeFounderEnrollment({ identity, presentedPublicKey, configuredPublicKey = '' }) {
  if (identity !== FOUNDER_SUBJECT) return { ok: true, founder: false };
  if (!configuredPublicKey) return { ok: false, status: 503, error: 'founder_enrollment_not_configured' };
  if (presentedPublicKey !== configuredPublicKey) return { ok: false, status: 403, error: 'founder_key_mismatch' };
  return { ok: true, founder: true, accountOrdinal: FOUNDER_ACCOUNT_ORDINAL, role: FOUNDER_ROLE };
}
