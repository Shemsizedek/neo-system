import { getGisdOrganizationSnapshot, getGisdPosition, authorizeGisdAdminView } from './giss-organization-registry.mjs';

// CSC-GISS-007: read-only, institution-scoped view model. No HTTP route or elevated authority.
export function createSuperintendentDashboardView({ actor, institutionId, institution, reporting = [] } = {}) {
  const permission = authorizeGisdAdminView({ actor, institutionId });
  if (!permission.allowed) return { allowed: false, reason: permission.reason };
  if (!institution || institution.id !== institutionId) return { allowed: false, reason: 'institution_mismatch' };
  const rows = Array.isArray(reporting) ? reporting : [];
  const institutionReports = rows.filter(row => row?.institutionId === institutionId && row?.visibility === 'institution');
  return {
    allowed: true,
    institutionId,
    institutionName: institution.name ?? null,
    registry: getGisdOrganizationSnapshot(),
    superintendent: getGisdPosition(1),
    reports: institutionReports.map(({ id, title, status }) => ({ id, title, status }))
  };
}
