import registry from '../../governance/csc/CSC-GISS-006-organizational-registry.json' with { type: 'json' };
import { authorizeInstitutionAction } from './giss-institution-authorization.mjs';

// Registry lookup is informational. A GISD position never supplies authentication or authority.
export function getGisdPosition(position) {
  if (!Number.isInteger(position)) return null;
  const record = registry.positions.find(entry => entry.position === position);
  return record ? structuredClone(record) : null;
}

export function getGisdOrganizationSnapshot() {
  return {
    registryId: registry.registryId,
    status: registry.status,
    source: structuredClone(registry.source),
    positions: registry.positions.map(({position,label}) => ({position,label}))
  };
}

// Require existing institution-scoped authorization before exposing any role-specific dashboard view.
export function authorizeGisdAdminView({ actor, institutionId } = {}) {
  return authorizeInstitutionAction({actor,institutionId,action:'institution.read'});
}
