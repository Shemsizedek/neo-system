// CSC-GISS-005: institution-scoped authorization core (not wired to production routes).
// Deny by default. Platform authentication is not an appointment.
export const INSTITUTION_ROLES = Object.freeze({
  ADMIN: 'institution_admin',
  OFFICER: 'temple_officer',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
  AUDITOR: 'auditor'
});

const READ = new Set(['institution.read', 'courses.read', 'reports.read']);
const ROLE_PERMISSIONS = Object.freeze({
  institution_admin: new Set([...READ, 'courses.manage', 'members.manage', 'appointments.propose']),
  temple_officer: new Set([...READ, 'appointments.propose']),
  instructor: new Set(['institution.read', 'courses.read', 'courses.teach']),
  student: new Set(['courses.read', 'progress.read.own']),
  auditor: new Set(['institution.read', 'reports.read'])
});

export function authorizeInstitutionAction({ actor, institutionId, action, resourceOwnerId } = {}) {
  if (!actor || typeof institutionId !== 'string' || !institutionId || typeof action !== 'string') {
    return { allowed: false, reason: 'invalid_request' };
  }
  const memberships = Array.isArray(actor.memberships) ? actor.memberships : [];
  const membership = memberships.find(m => m?.institutionId === institutionId && m?.active === true);
  if (!membership) return { allowed: false, reason: 'institution_membership_required' };
  const permissions = ROLE_PERMISSIONS[membership.role];
  if (!permissions || !permissions.has(action)) return { allowed: false, reason: 'permission_denied' };
  if (action === 'progress.read.own' && (!resourceOwnerId || resourceOwnerId !== actor.subjectId)) {
    return { allowed: false, reason: 'subject_mismatch' };
  }
  // Deliberately no appointment approval, role mutation, signing or publishing permissions.
  return { allowed: true, reason: 'authorized', institutionId, role: membership.role };
}
