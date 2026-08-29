import type { NomniDigitalTitle } from './nomniDigitalTitleRegistry'
import type { NomniEncumbranceGateResult } from './nomniEncumbranceRightsGate'
import type { NomniCertificateVerificationResult } from './nomniCertificateVerificationRevocationGate'

export type NomniStateTransitionType =
  | 'OWNERSHIP_TRANSFER'
  | 'LOCK'
  | 'UNLOCK'
  | 'RIGHT_GRANT'
  | 'RIGHT_RELEASE'
  | 'DELEGATION'
  | 'DELEGATION_REVOKE'
  | 'GOVERNANCE_ACTION'
  | 'DESCRIPTION_CHANGE'
  | 'OTHER'

export type NomniAuthorityRole =
  | 'CURRENT_VERIFIED_OWNER'
  | 'ISSUER'
  | 'RIGHT_HOLDER'
  | 'DELEGATE'
  | 'GOVERNANCE_AUTHORITY'
  | 'EXTERNAL_AUTHORITY'

export type NomniAuthorityEvidenceStatus = 'VERIFIED' | 'SUPPORTED' | 'CLAIMED' | 'DISPUTED' | 'UNRESOLVED'

export type NomniAuthorityEvidence = {
  id: string
  role: NomniAuthorityRole
  status: NomniAuthorityEvidenceStatus
  actorAddress?: string
  authorizedByAddress?: string
  scope: string[]
  txHash?: string
  signatureRef?: string
  sourceUrls: string[]
  notes: string[]
}

export type NomniStateTransitionProposal = {
  id: string
  type: NomniStateTransitionType
  actorAddress?: string
  fromOwnerAddress?: string
  toOwnerAddress?: string
  affectedRightId?: string
  description: string
  proposedTxHash?: string
  evidenceRefs: string[]
}

export type NomniTransitionAuthorityPolicy = {
  transitionType: NomniStateTransitionType
  requiredAnyOf: NomniAuthorityRole[][]
  requiresCurrentCertificate: boolean
  requiresUnencumberedTransferability: boolean
}

export type NomniStateTransitionAuthorityResult = {
  status: 'AUTHORIZED' | 'DENIED' | 'REVIEW'
  transitionId: string
  canonicalStateMutationEligible: boolean
  satisfiedRoles: NomniAuthorityRole[]
  missingRoleAlternatives: NomniAuthorityRole[][]
  reasons: string[]
  evidenceIds: string[]
}

const DEFAULT_POLICIES: NomniTransitionAuthorityPolicy[] = [
  { transitionType: 'OWNERSHIP_TRANSFER', requiredAnyOf: [['CURRENT_VERIFIED_OWNER']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: true },
  { transitionType: 'LOCK', requiredAnyOf: [['CURRENT_VERIFIED_OWNER'], ['ISSUER']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: false },
  { transitionType: 'UNLOCK', requiredAnyOf: [['CURRENT_VERIFIED_OWNER'], ['ISSUER']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: false },
  { transitionType: 'RIGHT_GRANT', requiredAnyOf: [['CURRENT_VERIFIED_OWNER'], ['RIGHT_HOLDER']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: false },
  { transitionType: 'RIGHT_RELEASE', requiredAnyOf: [['RIGHT_HOLDER'], ['CURRENT_VERIFIED_OWNER']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: false },
  { transitionType: 'DELEGATION', requiredAnyOf: [['CURRENT_VERIFIED_OWNER'], ['RIGHT_HOLDER']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: false },
  { transitionType: 'DELEGATION_REVOKE', requiredAnyOf: [['CURRENT_VERIFIED_OWNER'], ['RIGHT_HOLDER']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: false },
  { transitionType: 'GOVERNANCE_ACTION', requiredAnyOf: [['GOVERNANCE_AUTHORITY']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: false },
  { transitionType: 'DESCRIPTION_CHANGE', requiredAnyOf: [['CURRENT_VERIFIED_OWNER'], ['ISSUER']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: false },
  { transitionType: 'OTHER', requiredAnyOf: [['CURRENT_VERIFIED_OWNER'], ['EXTERNAL_AUTHORITY']], requiresCurrentCertificate: true, requiresUnencumberedTransferability: false }
]

function stableUnique<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function policyFor(type: NomniStateTransitionType, policies: NomniTransitionAuthorityPolicy[]): NomniTransitionAuthorityPolicy {
  return policies.find(policy => policy.transitionType === type) ?? DEFAULT_POLICIES.find(policy => policy.transitionType === 'OTHER')!
}

function evidenceIsUsable(evidence: NomniAuthorityEvidence): boolean {
  return evidence.status === 'VERIFIED' && evidence.sourceUrls.length > 0
}

function roleSatisfied(input: {
  role: NomniAuthorityRole
  proposal: NomniStateTransitionProposal
  title: NomniDigitalTitle
  authorityEvidence: NomniAuthorityEvidence[]
}): boolean {
  const usable = input.authorityEvidence.filter(evidence => evidenceIsUsable(evidence) && evidence.role === input.role)
  if (usable.length === 0) return false

  if (input.role === 'CURRENT_VERIFIED_OWNER') {
    return Boolean(input.title.verifiedOwnerAddress) && usable.some(evidence => evidence.actorAddress === input.title.verifiedOwnerAddress)
  }
  if (input.role === 'ISSUER') {
    const issuerAddress = input.title.issuerAddress
    return Boolean(issuerAddress) && usable.some(evidence => evidence.actorAddress === issuerAddress)
  }
  if (input.role === 'RIGHT_HOLDER' && input.proposal.affectedRightId) {
    return usable.some(evidence => evidence.scope.includes(input.proposal.affectedRightId) || evidence.scope.includes('*'))
  }
  if (input.proposal.actorAddress) {
    return usable.some(evidence => evidence.actorAddress === input.proposal.actorAddress || evidence.authorizedByAddress === input.proposal.actorAddress)
  }
  return true
}

export function evaluateNomniStateTransitionAuthority(input: {
  proposal: NomniStateTransitionProposal
  title: NomniDigitalTitle
  encumbranceGate: NomniEncumbranceGateResult
  certificateVerification: NomniCertificateVerificationResult
  authorityEvidence?: NomniAuthorityEvidence[]
  policies?: NomniTransitionAuthorityPolicy[]
}): NomniStateTransitionAuthorityResult {
  const authorityEvidence = input.authorityEvidence ?? []
  const policies = input.policies ?? DEFAULT_POLICIES
  const policy = policyFor(input.proposal.type, policies)
  const reasons: string[] = []

  if (policy.requiresCurrentCertificate && input.certificateVerification.status !== 'VALID') {
    reasons.push(`Current certificate verification status is ${input.certificateVerification.status}, not VALID.`)
  }

  if (policy.requiresUnencumberedTransferability) {
    if (input.encumbranceGate.status !== 'UNENCUMBERED') reasons.push(`Transition requires unencumbered transferability, but Encumbrance & Rights status is ${input.encumbranceGate.status}.`)
    if (input.encumbranceGate.blockingInterests.some(interest => interest.blocksTransfer)) reasons.push('At least one active interest explicitly blocks transfer.')
  }

  if (input.proposal.type === 'OWNERSHIP_TRANSFER') {
    if (!input.title.verifiedOwnerAddress) reasons.push('No current verified owner exists to authorize an ownership transfer.')
    if (input.proposal.fromOwnerAddress && input.title.verifiedOwnerAddress && input.proposal.fromOwnerAddress !== input.title.verifiedOwnerAddress) {
      reasons.push(`Proposed transfer grantor ${input.proposal.fromOwnerAddress} does not equal current verified owner ${input.title.verifiedOwnerAddress}.`)
    }
    if (!input.proposal.toOwnerAddress) reasons.push('Ownership-transfer proposal has no destination owner address.')
  }

  for (const evidence of authorityEvidence) {
    if (evidence.status === 'VERIFIED' && evidence.sourceUrls.length === 0) reasons.push(`Authority evidence ${evidence.id} is VERIFIED but has no source provenance.`)
    if (evidence.status === 'DISPUTED') reasons.push(`Authority evidence ${evidence.id} is disputed.`)
  }

  const satisfiedRoles = stableUnique(policy.requiredAnyOf.flat().filter(role => roleSatisfied({ role, proposal: input.proposal, title: input.title, authorityEvidence })))
  const authorizedAlternative = policy.requiredAnyOf.find(alternative => alternative.every(role => satisfiedRoles.includes(role)))
  const missingRoleAlternatives = policy.requiredAnyOf
    .map(alternative => alternative.filter(role => !satisfiedRoles.includes(role)))
    .filter(missing => missing.length > 0)

  if (!authorizedAlternative) {
    reasons.push(`No required authority path is fully verified for ${input.proposal.type}.`)
  }

  const disputedOrUnresolved = authorityEvidence.some(evidence => ['SUPPORTED', 'CLAIMED', 'DISPUTED', 'UNRESOLVED'].includes(evidence.status))
  const hardDenial = reasons.some(reason =>
    reason.includes('not VALID') ||
    reason.includes('blocks transfer') ||
    reason.includes('does not equal current verified owner') ||
    reason.includes('No current verified owner') ||
    reason.includes('no destination owner') ||
    reason.includes('No required authority path')
  )

  const status: NomniStateTransitionAuthorityResult['status'] = hardDenial ? 'DENIED' : disputedOrUnresolved || reasons.length > 0 ? 'REVIEW' : 'AUTHORIZED'

  return {
    status,
    transitionId: input.proposal.id,
    canonicalStateMutationEligible: status === 'AUTHORIZED',
    satisfiedRoles,
    missingRoleAlternatives,
    reasons: reasons.length > 0 ? stableUnique(reasons) : ['Required authority, current certificate state, and transition constraints reconcile.'],
    evidenceIds: stableUnique(authorityEvidence.map(evidence => evidence.id))
  }
}

export const nomniStateTransitionAuthorityGateV1 = {
  id: 'NEO-NOMNI-STATE-TRANSITION-AUTHORITY-GATE',
  version: '1.0.0',
  purpose: 'Prevent post-certification NOMNI ownership, rights, lock, delegation, governance, description, or other state changes from entering canonical state unless the proposing authority is explicitly verified.',
  principles: [
    'A valid prior title certificate does not itself authorize a later state mutation.',
    'Authority is role-specific: owner, issuer, right holder, delegate, governance authority, and external authority are not interchangeable.',
    'Ownership transfer requires authority traceable to the current verified owner and must respect active transfer-blocking interests.',
    'Claimed or disputed authority cannot silently become canonical authority.',
    'Authorization evidence must preserve source provenance and scope.',
    'AUTHORIZED is a NEO provenance/state-transition determination, not a universal legal judgment.'
  ],
  defaultPolicies: DEFAULT_POLICIES,
  evaluateNomniStateTransitionAuthority
} as const
