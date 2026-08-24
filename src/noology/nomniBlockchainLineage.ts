import { NOMNI_ISSUER_ADDRESS, NOMNI_OWNER_ADDRESS, NOMNI_SUPPLY } from './nomniProvenanceEngine'

export type NomniLineageEventType =
  | 'ISSUANCE'
  | 'OWNERSHIP_TRANSFER'
  | 'DESCRIPTION_CHANGE'
  | 'LOCK'
  | 'SEND'
  | 'DISTRIBUTION'
  | 'DEX_ORDER'
  | 'DEX_MATCH'
  | 'VERIFICATION'
  | 'OTHER'

export type NomniLineageStatus = 'VERIFIED' | 'CORROBORATED' | 'USER_SUPPLIED' | 'UNRESOLVED'

export type NomniLineageEvent = {
  id: string
  eventType: NomniLineageEventType
  status: NomniLineageStatus
  blockIndex?: number
  blockTime?: string
  txHash?: string
  sourceAddress?: string
  destinationAddress?: string
  ownerBefore?: string
  ownerAfter?: string
  quantity?: number
  description?: string
  sourceUrls: string[]
  notes: string[]
}

export type NomniOwnershipState = {
  issuerAddress: string
  currentOwnerAddress: string
  supply: number
  divisible: false
  locked: true
  ownershipTransferKnown: boolean
  ownershipTransferEventId?: string
}

export type NomniLineageReport = {
  generatedAt: string
  asset: 'NOMNI'
  ownership: NomniOwnershipState
  events: NomniLineageEvent[]
  unresolved: string[]
  warnings: string[]
}

export const nomniLineageSeedV1: NomniLineageEvent[] = [
  {
    id: 'NOMNI-LINEAGE-ISSUER-OWNER-SNAPSHOT',
    eventType: 'OTHER',
    status: 'USER_SUPPLIED',
    sourceAddress: NOMNI_ISSUER_ADDRESS,
    destinationAddress: NOMNI_OWNER_ADDRESS,
    description: 'Current metadata snapshot distinguishes original asset issuer from asset owner.',
    sourceUrls: ['http://xcp.coindaddy.io/NOMNI.json'],
    notes: [
      'This snapshot proves distinct issuer and owner roles in the supplied response.',
      'It does not by itself identify the transaction, block, or date on which ownership changed.'
    ]
  },
  {
    id: 'NOMNI-LINEAGE-COINDADDY-VERIFY-2017',
    eventType: 'VERIFICATION',
    status: 'CORROBORATED',
    blockIndex: 458112,
    blockTime: '2017-03-20T12:34:47Z',
    txHash: '02b553692692fc4db8400f0433a8599969ea6340b92e60b72e83647abd17b7f7',
    destinationAddress: NOMNI_OWNER_ADDRESS,
    description: 'CoinDaddy proof-of-ownership verification event associated with NOMNI metadata.',
    sourceUrls: ['https://whois.coindaddy.io/xcp/asset/NOMNI'],
    notes: ['Treat as corroborated until the Bitcoin/Counterparty transaction is directly decoded and linked to the relevant ownership state.']
  }
]

export function sortNomniLineage(events: NomniLineageEvent[]): NomniLineageEvent[] {
  return [...events].sort((a, b) => {
    if (a.blockIndex !== undefined && b.blockIndex !== undefined) return a.blockIndex - b.blockIndex
    if (a.blockTime && b.blockTime) return new Date(a.blockTime).getTime() - new Date(b.blockTime).getTime()
    if (a.blockIndex !== undefined || a.blockTime) return -1
    if (b.blockIndex !== undefined || b.blockTime) return 1
    return a.id.localeCompare(b.id)
  })
}

export function inferOwnershipState(events: NomniLineageEvent[]): NomniOwnershipState {
  const transfer = sortNomniLineage(events).find(event =>
    event.eventType === 'OWNERSHIP_TRANSFER' &&
    event.ownerAfter === NOMNI_OWNER_ADDRESS &&
    event.status === 'VERIFIED'
  )

  return {
    issuerAddress: NOMNI_ISSUER_ADDRESS,
    currentOwnerAddress: NOMNI_OWNER_ADDRESS,
    supply: NOMNI_SUPPLY,
    divisible: false,
    locked: true,
    ownershipTransferKnown: Boolean(transfer),
    ownershipTransferEventId: transfer?.id
  }
}

export function addNomniLineageEvent(events: NomniLineageEvent[], event: NomniLineageEvent): NomniLineageEvent[] {
  const withoutDuplicate = events.filter(existing => existing.id !== event.id)
  return sortNomniLineage([...withoutDuplicate, event])
}

export function ownershipTransferCandidates(events: NomniLineageEvent[]): NomniLineageEvent[] {
  return events.filter(event =>
    event.eventType === 'OWNERSHIP_TRANSFER' ||
    event.ownerBefore !== undefined ||
    event.ownerAfter !== undefined ||
    (event.sourceAddress === NOMNI_ISSUER_ADDRESS && event.destinationAddress === NOMNI_OWNER_ADDRESS)
  )
}

export function validateNomniLineage(events: NomniLineageEvent[]): string[] {
  const issues: string[] = []
  const verifiedTransfers = events.filter(event => event.eventType === 'OWNERSHIP_TRANSFER' && event.status === 'VERIFIED')

  for (const event of events) {
    if (event.status === 'VERIFIED' && !event.txHash && ['ISSUANCE','OWNERSHIP_TRANSFER','SEND','DEX_ORDER','DEX_MATCH'].includes(event.eventType)) {
      issues.push(`${event.id} is VERIFIED but lacks a transaction hash.`)
    }
    if (event.ownerAfter && event.eventType !== 'OWNERSHIP_TRANSFER') {
      issues.push(`${event.id} contains ownerAfter but is not classified as OWNERSHIP_TRANSFER.`)
    }
  }

  if (verifiedTransfers.length > 1) {
    const targets = new Set(verifiedTransfers.map(event => event.ownerAfter).filter(Boolean))
    if (targets.size > 1) issues.push('Multiple verified ownership transfers end at conflicting owner addresses; chronology review required.')
  }

  return issues
}

export function buildNomniBlockchainLineage(events: NomniLineageEvent[] = nomniLineageSeedV1): NomniLineageReport {
  const sorted = sortNomniLineage(events)
  const warnings = validateNomniLineage(sorted)
  const ownership = inferOwnershipState(sorted)

  return {
    generatedAt: new Date().toISOString(),
    asset: 'NOMNI',
    ownership,
    events: sorted,
    unresolved: [
      'Locate and decode the original NOMNI issuance transaction.',
      `Identify the exact ownership-transfer transaction from ${NOMNI_ISSUER_ADDRESS} to ${NOMNI_OWNER_ADDRESS}.`,
      'Reconstruct all asset description changes and lock events.',
      'Reconstruct sends, distributions, and DEX order/match activity chronologically.',
      'Cross-check every Counterparty event against the underlying Bitcoin transaction and block.'
    ],
    warnings
  }
}

export const nomniBlockchainLineageV1 = {
  id: 'NEO-NOMNI-BLOCKCHAIN-LINEAGE',
  version: '1.0.0',
  purpose: 'Reconstruct NOMNI issuance, ownership, lock, description, transfer, distribution, and market-event chronology without conflating issuer, owner, or transaction roles.',
  principles: [
    'Issuer is the originating asset-issuance address; owner is the address holding current asset ownership authority at a given state.',
    'A current metadata snapshot does not establish the date or mechanism of an ownership transfer.',
    'Transaction-level claims become VERIFIED only after direct blockchain/Counterparty decoding.',
    'Chronology outranks label assumptions when historical indexes use issuer and owner inconsistently.',
    'Every lineage event preserves transaction hash, block, addresses, source, and confidence whenever available.'
  ],
  seedEvents: nomniLineageSeedV1,
  sortNomniLineage,
  inferOwnershipState,
  addNomniLineageEvent,
  ownershipTransferCandidates,
  validateNomniLineage,
  buildNomniBlockchainLineage
} as const
