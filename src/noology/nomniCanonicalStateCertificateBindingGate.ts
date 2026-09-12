import type { NomniCanonicalCertificateHeadResult } from './nomniCanonicalCertificateHeadGate'
import type { NomniCanonicalProjectionResult } from './nomniCanonicalStateProjectionGate'
import type { NomniTitleCertificate } from './nomniTitleCertificationGate'

export type NomniStateCertificateBindingStatus =
  | 'BOUND'
  | 'DIVERGED'
  | 'INVALID_HEAD'
  | 'INVALID_STATE'
  | 'REVIEW'

export type NomniStateCertificateBindingResult = {
  status: NomniStateCertificateBindingStatus
  certificateId?: string
  ownerAddress?: string
  stateTransactionHashes: string[]
  certificateTransactionHashes: string[]
  sharedProvenanceRefs: string[]
  reasons: string[]
  downstreamOperationsEligible: boolean
}

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function bindNomniCanonicalStateToCertificate(input: {
  head: NomniCanonicalCertificateHeadResult
  projection: NomniCanonicalProjectionResult
  certificates: NomniTitleCertificate[]
}): NomniStateCertificateBindingResult {
  const reasons: string[] = []
  const stateTransactionHashes = stableUnique(input.projection.state?.appliedTransactionHashes ?? [])

  if (input.head.status !== 'RESOLVED' || !input.head.canonicalHead) {
    return {
      status: 'INVALID_HEAD',
      stateTransactionHashes,
      certificateTransactionHashes: [],
      sharedProvenanceRefs: [],
      reasons: [`Canonical Certificate Head Gate status is ${input.head.status}; no state binding may be established.`, ...input.head.reasons],
      downstreamOperationsEligible: false
    }
  }

  if (input.projection.status !== 'PROJECTED' || !input.projection.state) {
    return {
      status: 'INVALID_STATE',
      certificateId: input.head.canonicalHead.certificateId,
      ownerAddress: input.head.canonicalHead.ownerAddress,
      stateTransactionHashes,
      certificateTransactionHashes: [],
      sharedProvenanceRefs: [],
      reasons: [`Canonical State Projection Gate status is ${input.projection.status}; no state binding may be established.`, ...input.projection.reasons],
      downstreamOperationsEligible: false
    }
  }

  const head = input.head.canonicalHead
  const state = input.projection.state
  const certificate = input.certificates.find(item => item.certificateId === head.certificateId)

  if (!certificate) {
    return {
      status: 'INVALID_HEAD',
      certificateId: head.certificateId,
      ownerAddress: head.ownerAddress,
      stateTransactionHashes,
      certificateTransactionHashes: [],
      sharedProvenanceRefs: [],
      reasons: [`Resolved canonical head ${head.certificateId} is absent from the supplied certificate set.`],
      downstreamOperationsEligible: false
    }
  }

  const certificateTransactionHashes = stableUnique(certificate.titleTransactionHashes)
  const sharedProvenanceRefs = stableUnique(state.provenanceRefs.filter(ref => certificate.sourceUrls.includes(ref)))

  if (state.asset !== certificate.asset) reasons.push(`Projected asset ${state.asset} does not match certificate asset ${certificate.asset}.`)
  if (!state.ownerAddress) reasons.push('Projected canonical state has no owner address.')
  if (state.ownerAddress && state.ownerAddress !== certificate.ownerAddress) {
    reasons.push(`Projected owner ${state.ownerAddress} diverges from certificate owner ${certificate.ownerAddress}.`)
  }
  if (head.ownerAddress !== certificate.ownerAddress) {
    reasons.push(`Resolved head owner ${head.ownerAddress} diverges from certificate owner ${certificate.ownerAddress}.`)
  }
  if (state.locked !== certificate.locked) {
    reasons.push(`Projected lock state ${state.locked} diverges from certificate lock state ${certificate.locked}.`)
  }

  const activeStateRights = stableUnique(Object.keys(state.activeRights))
  const activeCertificateRights = stableUnique(certificate.activeInterestIds)
  if (JSON.stringify(activeStateRights) !== JSON.stringify(activeCertificateRights)) {
    reasons.push(`Projected active-right set [${activeStateRights.join(', ')}] diverges from certificate active-interest set [${activeCertificateRights.join(', ')}].`)
  }

  const stateTxNotCertified = stateTransactionHashes.filter(hash => !certificateTransactionHashes.includes(hash))
  if (stateTxNotCertified.length > 0) {
    reasons.push(`Projected state contains transaction hashes not represented by the canonical certificate: ${stateTxNotCertified.join(', ')}.`)
  }

  if (state.provenanceRefs.length > 0 && sharedProvenanceRefs.length === 0) {
    reasons.push('Projected state and canonical certificate have no shared provenance references.')
  }

  const divergence = reasons.some(reason => reason.includes('diverges') || reason.includes('not represented'))
  const status: NomniStateCertificateBindingStatus = divergence ? 'DIVERGED' : reasons.length > 0 ? 'REVIEW' : 'BOUND'

  return {
    status,
    certificateId: certificate.certificateId,
    ownerAddress: certificate.ownerAddress,
    stateTransactionHashes,
    certificateTransactionHashes,
    sharedProvenanceRefs,
    reasons: reasons.length > 0 ? stableUnique(reasons) : ['Canonical certificate head and projected NOMNI state reconcile across asset, owner, lock state, rights, transaction lineage, and provenance.'],
    downstreamOperationsEligible: status === 'BOUND'
  }
}

export const nomniCanonicalStateCertificateBindingGateV1 = {
  id: 'NEO-NOMNI-CANONICAL-STATE-CERTIFICATE-BINDING-GATE',
  version: '1.0.0',
  purpose: 'Bind the resolved canonical NOMNI certificate head to exactly one projected canonical state and block downstream operations whenever certified title and reconstructed state diverge.',
  principles: [
    'A state/certificate binding requires both a RESOLVED canonical certificate head and a PROJECTED canonical state.',
    'Certified owner, projected owner, asset identity, lock state, and active rights must reconcile.',
    'Projected transaction lineage must not silently outrun the transaction lineage represented by the current certificate.',
    'State and certificate provenance must remain referentially connected.',
    'Divergence blocks downstream NOMNI title/state operations until recertification or evidence reconciliation resolves it.',
    'The binding result is a NEO provenance control and does not substitute for external legal adjudication.'
  ],
  bindNomniCanonicalStateToCertificate
} as const
