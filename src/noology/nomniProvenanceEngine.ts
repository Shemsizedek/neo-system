export type NomniEvidenceClass = 'PRIMARY_BLOCKCHAIN' | 'PRIMARY_CONTEMPORARY_STATEMENT' | 'PRIMARY_ARTIFACT' | 'SECONDARY_INDEX' | 'SECONDARY_MIRROR' | 'LATER_REFERENCE'
export type NomniEvidenceStatus = 'VERIFIED' | 'CORROBORATED' | 'DISCOVERED' | 'MISSING_PRIMARY' | 'UNRESOLVED' | 'CONTRADICTED'
export type NomniClaimStatus = 'ESTABLISHED' | 'SUPPORTED' | 'CLAIMED' | 'UNRESOLVED'

export type NomniEvidenceRecord = {
  id: string
  title: string
  url: string
  evidenceClass: NomniEvidenceClass
  status: NomniEvidenceStatus
  observedAt?: string
  eventDate?: string
  facts: Record<string, string | number | boolean>
  supports: string[]
  notes: string[]
}

export type NomniClaim = {
  id: string
  proposition: string
  status: NomniClaimStatus
  evidenceIds: string[]
  notes: string[]
}

export type ArchiveTarget = {
  id: string
  originalUrl: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  reason: string
  expectedArtifact: string
  status: 'PENDING' | 'FOUND' | 'NOT_FOUND' | 'PARTIAL'
  discoveredUrls: string[]
}

export type NomniProvenanceReport = {
  generatedAt: string
  asset: {
    name: 'NOMNI'
    network: 'Counterparty'
    supply: number
    divisible: false
    locked: true
    issuerAddress: string
    ownerAddress: string
  }
  evidence: NomniEvidenceRecord[]
  claims: NomniClaim[]
  archiveTargets: ArchiveTarget[]
  unresolved: string[]
}

export const NOMNI_ISSUER_ADDRESS = '1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk'
export const NOMNI_OWNER_ADDRESS = '18FyntJG9hdXYvanm67mGgbyo1P7adckvg'
export const NOMNI_SUPPLY = 900_000_000
export const NOMNI_JSON = 'http://xcp.coindaddy.io/NOMNI.json'

/** @deprecated Use NOMNI_OWNER_ADDRESS or NOMNI_ISSUER_ADDRESS explicitly. */
export const NOMNI_ISSUER = NOMNI_ISSUER_ADDRESS

export const nomniEvidenceSeedV1: NomniEvidenceRecord[] = [
  {
    id: 'NOMNI-EV-USER-JSON',
    title: 'NOMNI asset JSON response supplied to NEO',
    url: NOMNI_JSON,
    evidenceClass: 'PRIMARY_ARTIFACT',
    status: 'VERIFIED',
    facts: {
      success: true,
      asset: 'NOMNI',
      asset_issuer_address: NOMNI_ISSUER_ADDRESS,
      asset_owner_address: NOMNI_OWNER_ADDRESS,
      asset_supply: String(NOMNI_SUPPLY),
      asset_divisible: false,
      asset_locked: true
    },
    supports: ['NOMNI-CLAIM-ASSET', 'NOMNI-CLAIM-ISSUER-OWNER-SPLIT', 'NOMNI-CLAIM-JSON'],
    notes: ['Source payload supplied directly by the user. Preserve issuer and current owner as distinct blockchain roles.']
  },
  {
    id: 'NOMNI-EV-COINDADDY',
    title: 'CoinDaddy NOMNI Asset Information',
    url: 'https://whois.coindaddy.io/xcp/asset/NOMNI',
    evidenceClass: 'SECONDARY_INDEX',
    status: 'CORROBORATED',
    facts: {
      asset: 'NOMNI', supply: NOMNI_SUPPLY, divisible: false, locked: true,
      ownerAddress: NOMNI_OWNER_ADDRESS, description: 'xcp.coindaddy.io/NOMNI.json',
      verificationBlock: 458112,
      verificationTime: '2017-03-20 12:34:47 GMT',
      verificationTransaction: '02b553692692fc4db8400f0433a8599969ea6340b92e60b72e83647abd17b7f7'
    },
    supports: ['NOMNI-CLAIM-ASSET', 'NOMNI-CLAIM-JSON', 'NOMNI-CLAIM-OWNERSHIP-PROOF'],
    notes: ['Secondary index preserving NOMNI metadata. Historical labels such as issuer/owner must be interpreted against Counterparty ownership history rather than assumed synonymous.']
  },
  {
    id: 'NOMNI-EV-TOKENSCAN',
    title: 'TokenScan NOMNI Asset Information',
    url: 'https://tokenscan.io/asset/NOMNI',
    evidenceClass: 'SECONDARY_INDEX',
    status: 'CORROBORATED',
    facts: { asset: 'NOMNI', supply: NOMNI_SUPPLY, divisible: false, locked: true, description: 'xcp.coindaddy.io/NOMNI.json' },
    supports: ['NOMNI-CLAIM-ASSET', 'NOMNI-CLAIM-JSON'],
    notes: ['Independent surviving index corroborating core asset metadata and the historical JSON description pointer.']
  },
  {
    id: 'NOMNI-EV-CP-2017',
    title: 'Counterparty Foundation Election Q&A — NooneSociety',
    url: 'https://forums.counterparty.io/t/q-a-counterparty-foundation-election-2016-q-a/2019',
    evidenceClass: 'PRIMARY_CONTEMPORARY_STATEMENT',
    status: 'VERIFIED',
    eventDate: '2017-02-28',
    facts: { referencedAsset: 'Nomni', platform: 'Counterparty', describedAs: 'digital asset & fiat token' },
    supports: ['NOMNI-CLAIM-CONTEMPORARY-CONCEPT', 'NOMNI-CLAIM-COUNTERPARTY-USE'],
    notes: ['Contemporaneous public statement preserving the NOMNI project concept.']
  },
  {
    id: 'NOMNI-EV-WHITEPAPER',
    title: 'Noone Society Presents Nomni White Paper (El Nomni Abyud Papyrus)',
    url: 'https://www.scribd.com/document/337766132/Noone-Society-Presents-Nomni-White-Paper-Nomni-El-Abyud-Papri',
    evidenceClass: 'SECONDARY_MIRROR',
    status: 'DISCOVERED',
    facts: { pages: 36, title: 'Nomni White Paper', project: 'Nomni' },
    supports: ['NOMNI-CLAIM-WHITEPAPER'],
    notes: ['Treat the mirror as distinct from original authored bytes until a trusted archival copy is recovered and hashed.']
  }
]

export const nomniClaimsV1: NomniClaim[] = [
  { id: 'NOMNI-CLAIM-ASSET', proposition: 'NOMNI exists as a Counterparty asset with a 900,000,000-unit locked, indivisible supply.', status: 'ESTABLISHED', evidenceIds: ['NOMNI-EV-USER-JSON','NOMNI-EV-COINDADDY','NOMNI-EV-TOKENSCAN'], notes: [] },
  { id: 'NOMNI-CLAIM-ISSUER-OWNER-SPLIT', proposition: `NOMNI records issuer ${NOMNI_ISSUER_ADDRESS} and owner ${NOMNI_OWNER_ADDRESS} as distinct addresses.`, status: 'ESTABLISHED', evidenceIds: ['NOMNI-EV-USER-JSON'], notes: ['Lineage analysis should determine when and through what transaction ownership moved from the issuer address to the owner address.'] },
  { id: 'NOMNI-CLAIM-JSON', proposition: 'The historical asset description points to xcp.coindaddy.io/NOMNI.json.', status: 'ESTABLISHED', evidenceIds: ['NOMNI-EV-USER-JSON','NOMNI-EV-COINDADDY','NOMNI-EV-TOKENSCAN'], notes: [] },
  { id: 'NOMNI-CLAIM-OWNERSHIP-PROOF', proposition: 'CoinDaddy records a proof-of-ownership verification event on 2017-03-20.', status: 'SUPPORTED', evidenceIds: ['NOMNI-EV-COINDADDY'], notes: ['Direct blockchain validation is still required for transaction-level canonical status.'] },
  { id: 'NOMNI-CLAIM-CONTEMPORARY-CONCEPT', proposition: 'Nomni was publicly described in the Counterparty community as a digital asset/fiat token by 2017-02-28.', status: 'ESTABLISHED', evidenceIds: ['NOMNI-EV-CP-2017'], notes: [] },
  { id: 'NOMNI-CLAIM-COUNTERPARTY-USE', proposition: 'The documented NOMNI project was intended to operate through Counterparty.', status: 'ESTABLISHED', evidenceIds: ['NOMNI-EV-CP-2017'], notes: [] },
  { id: 'NOMNI-CLAIM-WHITEPAPER', proposition: 'A NOMNI white paper circulated publicly and survives in at least one mirror/index.', status: 'SUPPORTED', evidenceIds: ['NOMNI-EV-WHITEPAPER'], notes: ['Original authored source file should be sought for hash-level provenance.'] }
]

export const nomniArchiveTargetsV1: ArchiveTarget[] = [
  { id: 'ARCHIVE-NOMNI-JSON', originalUrl: NOMNI_JSON, priority: 'CRITICAL', reason: 'Preserve and hash the original Counterparty enhanced-asset JSON payload.', expectedArtifact: 'NOMNI.json', status: 'PARTIAL', discoveredUrls: [] },
  { id: 'ARCHIVE-NOMNI-XCHAIN', originalUrl: 'https://xchain.io/asset/NOMNI', priority: 'HIGH', reason: 'Preserve historical asset explorer snapshots and ownership/transaction-linked metadata.', expectedArtifact: 'Historical NOMNI asset explorer snapshot', status: 'PENDING', discoveredUrls: [] },
  { id: 'ARCHIVE-NOMNI-WHITEPAPER', originalUrl: 'https://www.scribd.com/document/337766132/Noone-Society-Presents-Nomni-White-Paper-Nomni-El-Abyud-Papri', priority: 'HIGH', reason: 'Locate the earliest accessible white-paper version and compare revisions.', expectedArtifact: 'Nomni White Paper / El Nomni Abyud Papyrus', status: 'PENDING', discoveredUrls: [] }
]

export function waybackSnapshotUrl(targetUrl: string, timestamp = '*'): string {
  return `https://web.archive.org/web/${timestamp}/${targetUrl}`
}

export function waybackCdxUrl(targetUrl: string): string {
  return `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetUrl)}&output=json&filter=statuscode:200&collapse=digest`
}

export function archiveDiscoveryQueries(target: ArchiveTarget): string[] {
  const url = target.originalUrl.replace(/^https?:\/\//, '')
  return [`"${target.originalUrl}"`, `"${url}"`, '"NOMNI.json"', '"NOMNI" Counterparty CoinDaddy', `"NOMNI" "${NOMNI_ISSUER_ADDRESS}"`, `"NOMNI" "${NOMNI_OWNER_ADDRESS}"`]
}

export function buildNomniProvenanceReport(input?: { evidence?: NomniEvidenceRecord[]; claims?: NomniClaim[]; archiveTargets?: ArchiveTarget[] }): NomniProvenanceReport {
  const evidence = input?.evidence ?? nomniEvidenceSeedV1
  const claims = input?.claims ?? nomniClaimsV1
  const archiveTargets = input?.archiveTargets ?? nomniArchiveTargetsV1
  return {
    generatedAt: new Date().toISOString(),
    asset: { name: 'NOMNI', network: 'Counterparty', supply: NOMNI_SUPPLY, divisible: false, locked: true, issuerAddress: NOMNI_ISSUER_ADDRESS, ownerAddress: NOMNI_OWNER_ADDRESS },
    evidence,
    claims,
    archiveTargets,
    unresolved: [
      'Recover and hash an archival copy of the original NOMNI.json response.',
      'Determine the exact Counterparty transaction that established or transferred ownership from the issuer address to the current owner address.',
      'Validate the 2017 CoinDaddy proof-of-ownership transaction directly against blockchain data.',
      'Recover original authored NOMNI white-paper bytes and compare against surviving mirrors.',
      'Build a chronological issuance, transfer, description-change, send, distribution, and DEX history from Counterparty transaction data.'
    ]
  }
}

export function validateNomniProvenance(report: NomniProvenanceReport): string[] {
  const issues: string[] = []
  const ids = new Set(report.evidence.map(e => e.id))
  for (const claim of report.claims) {
    for (const evidenceId of claim.evidenceIds) if (!ids.has(evidenceId)) issues.push(`${claim.id} references missing evidence ${evidenceId}.`)
    if (claim.status === 'ESTABLISHED' && claim.evidenceIds.length === 0) issues.push(`${claim.id} is ESTABLISHED without evidence.`)
  }
  if (report.asset.issuerAddress === report.asset.ownerAddress) issues.push('Issuer and owner are unexpectedly identical; verify lineage input.')
  return issues
}

export const nomniProvenanceEngineV1 = {
  id: 'NEO-NOMNI-PROVENANCE',
  version: '1.1.0',
  purpose: 'Preserve, corroborate, and recover the documentary and blockchain provenance of NOMNI while explicitly distinguishing issuance from current ownership.',
  principles: [
    'Issuer and owner are separate provenance roles unless blockchain history demonstrates they are the same at a given moment.',
    'Primary blockchain records outrank third-party indexes for transaction facts.',
    'Contemporaneous statements are primary evidence of what was publicly asserted at the time.',
    'Mirrors and indexes corroborate provenance but do not silently replace original authored bytes.',
    'Every recovered artifact should be hashed, timestamped, source-located, and revision-compared before canonicalization.'
  ],
  evidence: nomniEvidenceSeedV1,
  claims: nomniClaimsV1,
  archiveTargets: nomniArchiveTargetsV1,
  waybackSnapshotUrl,
  waybackCdxUrl,
  archiveDiscoveryQueries,
  buildNomniProvenanceReport,
  validateNomniProvenance
} as const
