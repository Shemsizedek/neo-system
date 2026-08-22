export type TribunalRole = 'GRAND_SHEIK' | 'JUDGE' | 'CLERK' | 'MARSHAL' | 'REVIEWER' | 'VIEWER'
export type TribunalPermission = 'CASE_READ' | 'CASE_WRITE' | 'EVIDENCE_READ' | 'EVIDENCE_WRITE' | 'EVIDENCE_ADMIT' | 'FINDINGS_WRITE' | 'OPINION_WRITE' | 'PACKET_EXPORT' | 'AUDIT_SIGN' | 'DOCKET_VERSION'

export interface TribunalPrincipal {
  principalId: string
  displayName: string
  role: TribunalRole
}

const grants: Record<TribunalRole, TribunalPermission[]> = {
  GRAND_SHEIK:['CASE_READ','CASE_WRITE','EVIDENCE_READ','EVIDENCE_WRITE','EVIDENCE_ADMIT','FINDINGS_WRITE','OPINION_WRITE','PACKET_EXPORT','AUDIT_SIGN','DOCKET_VERSION'],
  JUDGE:['CASE_READ','CASE_WRITE','EVIDENCE_READ','EVIDENCE_ADMIT','FINDINGS_WRITE','OPINION_WRITE','PACKET_EXPORT','AUDIT_SIGN','DOCKET_VERSION'],
  CLERK:['CASE_READ','CASE_WRITE','EVIDENCE_READ','EVIDENCE_WRITE','PACKET_EXPORT','AUDIT_SIGN','DOCKET_VERSION'],
  MARSHAL:['CASE_READ','EVIDENCE_READ'],
  REVIEWER:['CASE_READ','EVIDENCE_READ','FINDINGS_WRITE','OPINION_WRITE'],
  VIEWER:['CASE_READ','EVIDENCE_READ'],
}

export const roleLabels:Record<TribunalRole,string> = {
  GRAND_SHEIK:'Grand Sheik / Presiding Authority',
  JUDGE:'Tribunal Judge',
  CLERK:'Tribunal Clerk',
  MARSHAL:'World Marshal',
  REVIEWER:'Legal Reviewer',
  VIEWER:'Read-only Observer',
}

export function can(principal:TribunalPrincipal, permission:TribunalPermission){
  return grants[principal.role].includes(permission)
}

export function requirePermission(principal:TribunalPrincipal, permission:TribunalPermission){
  if(!can(principal,permission)) throw new Error(`${roleLabels[principal.role]} lacks ${permission}`)
}
