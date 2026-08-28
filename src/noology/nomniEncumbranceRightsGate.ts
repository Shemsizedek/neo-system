import type { NomniDigitalTitle } from './nomniDigitalTitleRegistry'
import type { NomniTitleConflictGateResult } from './nomniTitleConflictGate'

export type NomniInterestType =
  | 'LOCK'
  | 'CUSTODY'
  | 'DELEGATED_AUTHORITY'
  | 'CONTRACTUAL_RESTRICTION'
  | 'GOVERNANCE_RIGHT'
  | 'LIEN_OR_SECURITY_INTEREST'
  | 'CLAIM'
  | 'BENEFICIAL_INTEREST'
  | 'OTHER'

export type NomniInterestStatus = 'VERIFIED' | 'SUPPORTED' | 'CLAIMED' | 'DISPUTED' | 'RELEASED' | 'UNRESOLVED'

export type NomniInterestRecord = {
  id: string
  type: NomniInterestType
  status: NomniInterestStatus
  holder?: string
  obligor?: string
  scope: string
  blocksTransfer: boolean
  blocksCleanTitle: boolean
  effectiveBlock?: number
  releasedBlock?: number
  sourceUrls: string[]
  notes: string[]
}

export type NomniEncumbranceGateResult = {
  status: 'UNENCUMBERED' | 'ENCUMBERED' | 'REVIEW' | 'CONFLICT'
  unencumberedTitleEligible: boolean
  activeInterests: NomniInterestRecord[]
  releasedInterests: NomniInterestRecord[]
  blockingInterests: NomniInterestRecord[]
  reviewInterests: NomniInterestRecord[]
  warnings: string[]
}

function isActiveInterest(interest: NomniInterestRecord): boolean {
  return interest.status !== 'RELEASED' && interest.releasedBlock === undefined
}

function interestRequiresReview(interest: NomniInterestRecord): boolean {
  return ['SUPPORTED', 'CLAIMED', 'DISPUTED', 'UNRESOLVED'].includes(interest.status)
}

export function evaluateNomniEncumbrances(input: {
  title: NomniDigitalTitle
  conflictGate: NomniTitleConflictGateResult
  interests?: NomniInterestRecord[]
}): NomniEncumbranceGateResult {
  const interests = input.interests ?? []
  const activeInterests = interests.filter(isActiveInterest)
  const releasedInterests = interests.filter(interest => !isActiveInterest(interest))
  const blockingInterests = activeInterests.filter(interest => interest.blocksCleanTitle || interest.blocksTransfer)
  const reviewInterests = activeInterests.filter(interest => interestRequiresReview(interest))
  const warnings: string[] = []

  if (!input.conflictGate.cleanTitleEligible) {
    warnings.push(`Upstream title-conflict gate is ${input.conflictGate.status}; encumbrance review cannot cure a defective or unresolved chain of title.`)
  }

  if (input.title.locked && !activeInterests.some(interest => interest.type === 'LOCK')) {
    warnings.push('NOMNI metadata reports the asset as locked, but no explicit LOCK interest record was supplied to explain the scope and legal/data effect of that lock.')
  }

  for (const interest of activeInterests) {
    if (interest.status === 'VERIFIED' && interest.sourceUrls.length === 0) {
      warnings.push(`${interest.id} is VERIFIED but has no source provenance.`)
    }
    if (interest.blocksTransfer && interest.type === 'GOVERNANCE_RIGHT') {
      warnings.push(`${interest.id} is a governance right marked as transfer-blocking; confirm that the underlying instrument actually restricts transfer rather than merely conferring participation rights.`)
    }
    if (interest.status === 'RELEASED' && interest.releasedBlock === undefined) {
      warnings.push(`${interest.id} is RELEASED without a release block or other chronology marker.`)
    }
  }

  const disputedBlocking = blockingInterests.some(interest => interest.status === 'DISPUTED')
  const unresolvedBlocking = blockingInterests.some(interest => ['CLAIMED', 'SUPPORTED', 'UNRESOLVED'].includes(interest.status))
  const verifiedBlocking = blockingInterests.some(interest => interest.status === 'VERIFIED')

  const status: NomniEncumbranceGateResult['status'] =
    input.conflictGate.status === 'CONFLICT' || disputedBlocking
      ? 'CONFLICT'
      : verifiedBlocking
        ? 'ENCUMBERED'
        : unresolvedBlocking || reviewInterests.length > 0 || warnings.length > 0
          ? 'REVIEW'
          : 'UNENCUMBERED'

  return {
    status,
    unencumberedTitleEligible:
      status === 'UNENCUMBERED' &&
      input.conflictGate.cleanTitleEligible &&
      input.title.status === 'VERIFIED_TITLE',
    activeInterests,
    releasedInterests,
    blockingInterests,
    reviewInterests,
    warnings
  }
}

export const nomniEncumbranceRightsGateV1 = {
  id: 'NEO-NOMNI-ENCUMBRANCE-RIGHTS-GATE',
  version: '1.0.0',
  purpose: 'Determine whether a conflict-tested NOMNI digital title is subject to active restrictions, delegated rights, custody, claims, liens, governance interests, or other encumbrances before it may be treated as unencumbered.',
  principles: [
    'Verified ownership does not by itself mean unrestricted or unencumbered title.',
    'Custody, beneficial interest, delegated authority, governance rights, and full ownership are distinct roles.',
    'A released interest must remain in the historical record rather than being silently deleted.',
    'Claims and disputed interests remain visible even when they are not yet verified.',
    'An encumbrance gate cannot repair a broken chain of title from an upstream gate.',
    'UNENCUMBERED is a provenance status within NEO, not a universal court judgment.'
  ],
  evaluateNomniEncumbrances
} as const
