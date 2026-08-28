import type { NomniLineageEvent, NomniLineageEventType } from './nomniBlockchainLineage'

export type VerificationGateStatus = 'PASS' | 'FAIL' | 'REVIEW'

export type NomniTransactionProof = {
  txHash: string
  blockIndex?: number
  blockTime?: string
  sourceAddress?: string
  destinationAddress?: string
  asset?: string
  eventType?: NomniLineageEventType
  quantity?: number
  decodedBy: string[]
  rawSourceUrls: string[]
  counterpartyConfirmed: boolean
  bitcoinConfirmed: boolean
}

export type NomniVerificationResult = {
  status: VerificationGateStatus
  promotableToVerified: boolean
  checks: Record<string, boolean>
  reasons: string[]
}

export function verifyNomniLineageEvent(event: NomniLineageEvent, proof?: NomniTransactionProof): NomniVerificationResult {
  const reasons: string[] = []
  if (!proof) return { status: 'REVIEW', promotableToVerified: false, checks: {}, reasons: ['No direct transaction proof supplied.'] }

  const checks = {
    assetMatches: proof.asset === 'NOMNI',
    txHashMatches: Boolean(event.txHash && event.txHash === proof.txHash),
    eventTypeMatches: Boolean(proof.eventType && proof.eventType === event.eventType),
    blockMatches: event.blockIndex === undefined || proof.blockIndex === event.blockIndex,
    sourceMatches: event.sourceAddress === undefined || proof.sourceAddress === event.sourceAddress,
    destinationMatches: event.destinationAddress === undefined || proof.destinationAddress === event.destinationAddress,
    counterpartyConfirmed: proof.counterpartyConfirmed,
    bitcoinConfirmed: proof.bitcoinConfirmed,
    hasRawSources: proof.rawSourceUrls.length > 0,
    hasDecoderProvenance: proof.decodedBy.length > 0
  }

  for (const [name, ok] of Object.entries(checks)) if (!ok) reasons.push(`Failed verification check: ${name}.`)

  const required = Object.values(checks).every(Boolean)
  return {
    status: required ? 'PASS' : 'FAIL',
    promotableToVerified: required,
    checks,
    reasons: required ? ['Direct Counterparty and Bitcoin evidence reconciled.'] : reasons
  }
}

export function promoteNomniEvent(event: NomniLineageEvent, proof: NomniTransactionProof): NomniLineageEvent {
  const result = verifyNomniLineageEvent(event, proof)
  if (!result.promotableToVerified) return { ...event, notes: [...event.notes, ...result.reasons] }
  return {
    ...event,
    status: 'VERIFIED',
    txHash: proof.txHash,
    blockIndex: proof.blockIndex ?? event.blockIndex,
    blockTime: proof.blockTime ?? event.blockTime,
    sourceAddress: proof.sourceAddress ?? event.sourceAddress,
    destinationAddress: proof.destinationAddress ?? event.destinationAddress,
    sourceUrls: [...new Set([...event.sourceUrls, ...proof.rawSourceUrls])],
    notes: [...event.notes, 'Promoted by NOMNI Transaction Verification Gate after direct Counterparty/Bitcoin reconciliation.']
  }
}

export const nomniTransactionVerificationGateV1 = {
  id: 'NEO-NOMNI-TRANSACTION-VERIFICATION-GATE',
  version: '1.0.0',
  purpose: 'Prevent NOMNI title and lineage events from becoming VERIFIED until direct blockchain evidence reconciles transaction, block, addresses, asset action, and provenance.',
  principles: [
    'Indexes and mirrors may corroborate but cannot independently satisfy the transaction-verification gate.',
    'Issuer, owner, source, and destination roles remain distinct.',
    'A transaction hash without a decoded NOMNI action is insufficient.',
    'Counterparty decoding and underlying Bitcoin confirmation must both pass.',
    'Failed or incomplete evidence remains REVIEW or FAIL; no gap-filling by inference.'
  ],
  verifyNomniLineageEvent,
  promoteNomniEvent
} as const
