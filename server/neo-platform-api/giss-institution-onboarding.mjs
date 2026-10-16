// CSC-GISS-013: Validate an institution onboarding request before an authorized
// operator reviews it. This module NEVER writes memberships or grants privileges.
const TYPES = new Set(['moorish_branch_temple','church','temple_school','independent_school','other']);
const ID = /^[A-Za-z0-9_-]{1,80}$/;
export function validateInstitutionOnboardingRequest(input = {}) {
  const errors = [];
  if (!ID.test(input.institutionId ?? '')) errors.push('invalid_institution_id');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 200) errors.push('invalid_institution_name');
  if (!TYPES.has(input.type)) errors.push('invalid_institution_type');
  if (typeof input.representativeSubjectId !== 'string' || !input.representativeSubjectId.trim()) errors.push('representative_required');
  if (typeof input.governanceEvidenceRef !== 'string' || !input.governanceEvidenceRef.trim()) errors.push('governance_evidence_required');
  if (input.institutionConsent !== true) errors.push('institution_consent_required');
  return { valid: errors.length === 0, errors, reviewRequired: true, membershipGranted: false };
}
