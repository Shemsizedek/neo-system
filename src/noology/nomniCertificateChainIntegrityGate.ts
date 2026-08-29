import type { NomniTitleCertificate } from './nomniTitleCertificationGate'
import type { NomniCertificateRevocationRecord } from './nomniCertificateVerificationRevocationGate'

export type NomniCertificateChainIntegrityStatus =
  | 'VALID_CHAIN'
  | 'BROKEN_CHAIN'
  | 'FORKED_CHAIN'
  | 'CYCLE_DETECTED'
  | 'REVIEW'

export type NomniCertificateChainNode = {
  certificateId: string
  ownerAddress: string
  issuedAt: string
  sha256: string
  sourceUrls: string[]
}

export type NomniCertificateChainLink = {
  predecessorCertificateId: string
  successorCertificateId: string
  revocationRecordId: string
  effectiveAt: string
  evidenceRefs: string[]
}

export type NomniCertificateChainIntegrityResult = {
  status: NomniCertificateChainIntegrityStatus
  rootCertificateIds: string[]
  terminalCertificateIds: string[]
  orderedChains: string[][]
  reasons: string[]
  nodes: NomniCertificateChainNode[]
  links: NomniCertificateChainLink[]
}

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function certMap(certificates: NomniTitleCertificate[]): Map<string, NomniTitleCertificate> {
  return new Map(certificates.map(certificate => [certificate.certificateId, certificate]))
}

function buildLinks(records: NomniCertificateRevocationRecord[]): NomniCertificateChainLink[] {
  return records
    .filter(record => record.status === 'SUPERSEDED' && record.supersededByCertificateId)
    .map(record => ({
      predecessorCertificateId: record.certificateId,
      successorCertificateId: record.supersededByCertificateId!,
      revocationRecordId: record.id,
      effectiveAt: record.effectiveAt,
      evidenceRefs: stableUnique(record.evidenceRefs)
    }))
}

function detectCycles(links: NomniCertificateChainLink[]): string[][] {
  const next = new Map<string, string[]>()
  for (const link of links) {
    const bucket = next.get(link.predecessorCertificateId) ?? []
    bucket.push(link.successorCertificateId)
    next.set(link.predecessorCertificateId, bucket)
  }

  const cycles: string[][] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  const walk = (node: string, path: string[]) => {
    if (visiting.has(node)) {
      const index = path.indexOf(node)
      cycles.push(index >= 0 ? [...path.slice(index), node] : [...path, node])
      return
    }
    if (visited.has(node)) return

    visiting.add(node)
    const updatedPath = [...path, node]
    for (const child of next.get(node) ?? []) walk(child, updatedPath)
    visiting.delete(node)
    visited.add(node)
  }

  for (const node of next.keys()) walk(node, [])
  return cycles
}

function orderChains(
  roots: string[],
  links: NomniCertificateChainLink[]
): string[][] {
  const next = new Map<string, string[]>()
  for (const link of links) {
    const bucket = next.get(link.predecessorCertificateId) ?? []
    bucket.push(link.successorCertificateId)
    next.set(link.predecessorCertificateId, stableUnique(bucket))
  }

  const chains: string[][] = []
  const walk = (node: string, path: string[]) => {
    const children = next.get(node) ?? []
    const updated = [...path, node]
    if (children.length === 0) {
      chains.push(updated)
      return
    }
    for (const child of children) {
      if (updated.includes(child)) {
        chains.push([...updated, child])
        continue
      }
      walk(child, updated)
    }
  }

  for (const root of roots) walk(root, [])
  return chains
}

export function auditNomniCertificateChainIntegrity(input: {
  certificates: NomniTitleCertificate[]
  revocations: NomniCertificateRevocationRecord[]
}): NomniCertificateChainIntegrityResult {
  const reasons: string[] = []
  const certificates = certMap(input.certificates)
  const links = buildLinks(input.revocations)

  const outgoing = new Map<string, NomniCertificateChainLink[]>()
  const incoming = new Map<string, NomniCertificateChainLink[]>()

  for (const link of links) {
    const out = outgoing.get(link.predecessorCertificateId) ?? []
    out.push(link)
    outgoing.set(link.predecessorCertificateId, out)

    const inc = incoming.get(link.successorCertificateId) ?? []
    inc.push(link)
    incoming.set(link.successorCertificateId, inc)

    if (!certificates.has(link.predecessorCertificateId)) {
      reasons.push(`Supersession ${link.revocationRecordId} references missing predecessor certificate ${link.predecessorCertificateId}.`)
    }
    if (!certificates.has(link.successorCertificateId)) {
      reasons.push(`Supersession ${link.revocationRecordId} references missing successor certificate ${link.successorCertificateId}.`)
    }
    if (link.predecessorCertificateId === link.successorCertificateId) {
      reasons.push(`Supersession ${link.revocationRecordId} self-references certificate ${link.predecessorCertificateId}.`)
    }
    if (link.evidenceRefs.length === 0) {
      reasons.push(`Supersession ${link.revocationRecordId} has no provenance evidence references.`)
    }
  }

  for (const [certificateId, records] of outgoing) {
    const successors = stableUnique(records.map(record => record.successorCertificateId))
    if (successors.length > 1) {
      reasons.push(`Certificate ${certificateId} forks to multiple successors: ${successors.join(', ')}.`)
    }
  }

  for (const [certificateId, records] of incoming) {
    const predecessors = stableUnique(records.map(record => record.predecessorCertificateId))
    if (predecessors.length > 1) {
      reasons.push(`Certificate ${certificateId} has multiple predecessors: ${predecessors.join(', ')}.`)
    }
  }

  for (const certificate of input.certificates) {
    if (certificate.certificateId !== `NOMNI-SHA256-${certificate.sha256}`) {
      reasons.push(`Certificate ${certificate.certificateId} does not reconcile with its embedded SHA-256 identifier.`)
    }
    if (!certificate.ownerAddress) reasons.push(`Certificate ${certificate.certificateId} has no owner address.`)
    if (certificate.sourceUrls.length === 0) reasons.push(`Certificate ${certificate.certificateId} has no source provenance references.`)
  }

  const cycles = detectCycles(links)
  for (const cycle of cycles) reasons.push(`Certificate supersession cycle detected: ${cycle.join(' -> ')}.`)

  const allIds = stableUnique(input.certificates.map(certificate => certificate.certificateId))
  const rootCertificateIds = allIds.filter(id => (incoming.get(id) ?? []).length === 0)
  const terminalCertificateIds = allIds.filter(id => (outgoing.get(id) ?? []).length === 0)

  if (allIds.length > 0 && rootCertificateIds.length === 0) reasons.push('Certificate set has no root certificate.')
  if (allIds.length > 0 && terminalCertificateIds.length === 0) reasons.push('Certificate set has no terminal certificate.')

  const orderedChains = orderChains(rootCertificateIds, links)
  const covered = new Set(orderedChains.flat())
  for (const id of allIds) {
    if (!covered.has(id)) reasons.push(`Certificate ${id} is disconnected from every root-to-terminal chain.`)
  }

  const forked = reasons.some(reason => reason.includes('forks to multiple successors') || reason.includes('multiple predecessors'))
  const cycled = cycles.length > 0 || reasons.some(reason => reason.includes('self-references'))
  const broken = reasons.some(reason =>
    reason.includes('missing predecessor') ||
    reason.includes('missing successor') ||
    reason.includes('disconnected') ||
    reason.includes('no root certificate') ||
    reason.includes('no terminal certificate') ||
    reason.includes('does not reconcile with its embedded SHA-256')
  )

  const status: NomniCertificateChainIntegrityStatus = cycled
    ? 'CYCLE_DETECTED'
    : forked
      ? 'FORKED_CHAIN'
      : broken
        ? 'BROKEN_CHAIN'
        : reasons.length > 0
          ? 'REVIEW'
          : 'VALID_CHAIN'

  return {
    status,
    rootCertificateIds,
    terminalCertificateIds,
    orderedChains,
    reasons: reasons.length > 0 ? stableUnique(reasons) : ['Certificate succession forms a single, provenance-preserving, acyclic chain with complete predecessor/successor references.'],
    nodes: input.certificates.map(certificate => ({
      certificateId: certificate.certificateId,
      ownerAddress: certificate.ownerAddress,
      issuedAt: certificate.issuedAt,
      sha256: certificate.sha256,
      sourceUrls: stableUnique(certificate.sourceUrls)
    })),
    links
  }
}

export const nomniCertificateChainIntegrityGateV1 = {
  id: 'NEO-NOMNI-CERTIFICATE-CHAIN-INTEGRITY-GATE',
  version: '1.0.0',
  purpose: 'Audit NOMNI certificate history across repeated recertification rollovers and prevent forked, cyclic, disconnected, or provenance-defective certificate succession from being treated as canonical.',
  principles: [
    'Each superseded certificate may have at most one canonical successor.',
    'Each successor certificate may have at most one canonical predecessor.',
    'Every supersession link must reference existing predecessor and successor certificates and preserve provenance evidence.',
    'Certificate succession must remain acyclic and append-only.',
    'Disconnected certificates, broken SHA-256 identifiers, and missing lineage anchors are explicit integrity defects.',
    'A valid certificate chain is a NEO provenance result, not a universal legal determination.'
  ],
  auditNomniCertificateChainIntegrity
} as const
