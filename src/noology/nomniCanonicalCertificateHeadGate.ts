import type { NomniTitleCertificate } from './nomniTitleCertificationGate'
import type { NomniCertificateRevocationRecord } from './nomniCertificateVerificationRevocationGate'
import type { NomniCertificateChainIntegrityResult } from './nomniCertificateChainIntegrityGate'

export type NomniCanonicalCertificateHeadStatus =
  | 'RESOLVED'
  | 'AMBIGUOUS'
  | 'INVALID_CHAIN'
  | 'MISSING_HEAD'
  | 'REVIEW'

export type NomniCanonicalCertificateHead = {
  certificateId: string
  ownerAddress: string
  issuerAddress: string
  issuedAt: string
  sha256: string
  predecessorCertificateId?: string
  rootCertificateId: string
  chainDepth: number
  sourceUrls: string[]
}

export type NomniCanonicalCertificateHeadResult = {
  status: NomniCanonicalCertificateHeadStatus
  canonicalHead?: NomniCanonicalCertificateHead
  candidateHeadIds: string[]
  reasons: string[]
}

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function buildCertificateMap(certificates: NomniTitleCertificate[]): Map<string, NomniTitleCertificate> {
  return new Map(certificates.map(certificate => [certificate.certificateId, certificate]))
}

function predecessorFor(
  certificateId: string,
  revocations: NomniCertificateRevocationRecord[]
): string | undefined {
  const predecessors = stableUnique(
    revocations
      .filter(record => record.status === 'SUPERSEDED' && record.supersededByCertificateId === certificateId)
      .map(record => record.certificateId)
  )
  return predecessors.length === 1 ? predecessors[0] : undefined
}

function chainContaining(certificateId: string, chains: string[][]): string[] | undefined {
  return chains.find(chain => chain.includes(certificateId))
}

export function resolveNomniCanonicalCertificateHead(input: {
  certificates: NomniTitleCertificate[]
  revocations: NomniCertificateRevocationRecord[]
  chainIntegrity: NomniCertificateChainIntegrityResult
}): NomniCanonicalCertificateHeadResult {
  const reasons: string[] = []
  const certificates = buildCertificateMap(input.certificates)
  const candidateHeadIds = stableUnique(input.chainIntegrity.terminalCertificateIds)

  if (input.chainIntegrity.status !== 'VALID_CHAIN') {
    reasons.push(`Certificate Chain Integrity Gate status is ${input.chainIntegrity.status}, not VALID_CHAIN.`)
  }
  if (candidateHeadIds.length === 0) reasons.push('No terminal certificate exists to resolve as canonical head.')
  if (candidateHeadIds.length > 1) reasons.push(`Multiple terminal certificates exist: ${candidateHeadIds.join(', ')}.`)
  if (input.chainIntegrity.rootCertificateIds.length !== 1) {
    reasons.push(`Canonical head resolution requires exactly one root certificate; found ${input.chainIntegrity.rootCertificateIds.length}.`)
  }

  for (const id of candidateHeadIds) {
    if (!certificates.has(id)) reasons.push(`Terminal certificate ${id} is absent from the supplied certificate set.`)
  }

  if (input.chainIntegrity.status !== 'VALID_CHAIN') {
    return {
      status: 'INVALID_CHAIN',
      candidateHeadIds,
      reasons: stableUnique([...reasons, ...input.chainIntegrity.reasons])
    }
  }

  if (candidateHeadIds.length === 0) {
    return { status: 'MISSING_HEAD', candidateHeadIds, reasons: stableUnique(reasons) }
  }

  if (candidateHeadIds.length !== 1 || input.chainIntegrity.rootCertificateIds.length !== 1) {
    return { status: 'AMBIGUOUS', candidateHeadIds, reasons: stableUnique(reasons) }
  }

  const headId = candidateHeadIds[0]
  const head = certificates.get(headId)
  if (!head) {
    return {
      status: 'MISSING_HEAD',
      candidateHeadIds,
      reasons: stableUnique([...reasons, `Canonical candidate ${headId} cannot be resolved to a certificate record.`])
    }
  }

  if (head.certificateId !== `NOMNI-SHA256-${head.sha256}`) {
    reasons.push(`Candidate head ${head.certificateId} does not reconcile with its embedded SHA-256 identifier.`)
  }
  if (!head.ownerAddress) reasons.push(`Candidate head ${head.certificateId} has no owner address.`)
  if (head.sourceUrls.length === 0) reasons.push(`Candidate head ${head.certificateId} has no source provenance.`)

  const chain = chainContaining(headId, input.chainIntegrity.orderedChains)
  if (!chain) reasons.push(`Candidate head ${headId} is not present in any ordered certificate chain.`)
  else if (chain[chain.length - 1] !== headId) reasons.push(`Candidate head ${headId} is not terminal in its resolved ordered chain.`)

  const rootId = input.chainIntegrity.rootCertificateIds[0]
  if (chain && chain[0] !== rootId) reasons.push(`Candidate head ${headId} does not descend from canonical root ${rootId}.`)

  const supersededHeadRecord = input.revocations.find(
    record => record.certificateId === headId && record.status === 'SUPERSEDED'
  )
  if (supersededHeadRecord) {
    reasons.push(`Terminal candidate ${headId} is itself superseded by ${supersededHeadRecord.supersededByCertificateId ?? 'UNKNOWN'}, so it cannot be canonical head.`)
  }

  if (reasons.length > 0) {
    return { status: 'REVIEW', candidateHeadIds, reasons: stableUnique(reasons) }
  }

  return {
    status: 'RESOLVED',
    canonicalHead: {
      certificateId: head.certificateId,
      ownerAddress: head.ownerAddress,
      issuerAddress: head.issuerAddress,
      issuedAt: head.issuedAt,
      sha256: head.sha256,
      predecessorCertificateId: predecessorFor(head.certificateId, input.revocations),
      rootCertificateId: rootId,
      chainDepth: Math.max((chain?.length ?? 1) - 1, 0),
      sourceUrls: stableUnique(head.sourceUrls)
    },
    candidateHeadIds,
    reasons: ['Exactly one terminal certificate descends from the single validated root and resolves as the canonical current NOMNI certificate head.']
  }
}

export const nomniCanonicalCertificateHeadGateV1 = {
  id: 'NEO-NOMNI-CANONICAL-CERTIFICATE-HEAD-GATE',
  version: '1.0.0',
  purpose: 'Resolve one authoritative current NOMNI certificate from a validated certificate succession chain and refuse ambiguous, forked, broken, cyclic, or provenance-defective heads.',
  principles: [
    'Canonical head resolution requires a VALID_CHAIN result from the Certificate Chain Integrity Gate.',
    'Exactly one root and exactly one terminal certificate must exist before a canonical head can be resolved.',
    'A terminal certificate must exist in the supplied certificate set, preserve its SHA-256 identifier, owner, and source provenance, and descend from the canonical root.',
    'A certificate already marked SUPERSEDED cannot remain the canonical head.',
    'Ambiguous or defective head candidates are never selected by timestamp, lexical order, or convenience.',
    'The resolved head is the sole NEO certificate reference for downstream NOMNI title/state operations until a valid rollover changes it.'
  ],
  resolveNomniCanonicalCertificateHead
} as const
