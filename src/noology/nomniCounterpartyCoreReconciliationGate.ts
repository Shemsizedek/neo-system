import type { NomniLineageEvent, NomniLineageEventType } from './nomniBlockchainLineage'
import type { NomniTransactionProof } from './nomniTransactionVerificationGate'

export type CounterpartyCoreEvent = {
  txHash: string
  blockIndex?: number
  blockTime?: string
  asset?: string
  eventType?: string
  sourceAddress?: string
  destinationAddress?: string
  quantity?: number | string
  valid: boolean
  confirmed: boolean
  apiUrl: string
  coreVersion?: string
  rawEvent?: unknown
}

export type BitcoinTransactionAnchor = {
  txHash: string
  blockIndex?: number
  confirmed: boolean
  sourceUrl: string
}

export type NomniCoreReconciliationStatus = 'RECONCILED' | 'REJECTED' | 'REVIEW'

export type NomniCoreReconciliationResult = {
  status: NomniCoreReconciliationStatus
  proof?: NomniTransactionProof
  checks: Record<string, boolean>
  reasons: string[]
}

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function normalized(value?: string): string | undefined {
  return value?.trim().toUpperCase()
}

function counterpartyEventMatches(eventType: NomniLineageEventType, decoded?: string): boolean {
  if (!decoded) return true
  const normalizedDecoded = normalized(decoded)?.replace(/[-\s]+/g, '_')
  return normalizedDecoded === eventType
}

export function reconcileNomniCounterpartyCoreEvent(input: {
  event: NomniLineageEvent
  counterparty: CounterpartyCoreEvent
  bitcoin: BitcoinTransactionAnchor
}): NomniCoreReconciliationResult {
  const { event, counterparty, bitcoin } = input
  const hasTxHash = Boolean(event.txHash)
  const checks: Record<string, boolean> = {
    transactionIdentity: hasTxHash && counterparty.txHash === event.txHash && bitcoin.txHash === event.txHash,
    nomniAsset: normalized(counterparty.asset) === 'NOMNI',
    counterpartyValid: counterparty.valid,
    counterpartyConfirmed: counterparty.confirmed,
    bitcoinConfirmed: bitcoin.confirmed,
    blockReconciled:
      event.blockIndex === undefined ||
      (counterparty.blockIndex === event.blockIndex &&
        (bitcoin.blockIndex === undefined || bitcoin.blockIndex === event.blockIndex)),
    eventTypeReconciled: counterpartyEventMatches(event.eventType, counterparty.eventType),
    sourceReconciled:
      !event.sourceAddress || !counterparty.sourceAddress || event.sourceAddress === counterparty.sourceAddress,
    destinationReconciled:
      !event.destinationAddress || !counterparty.destinationAddress || event.destinationAddress === counterparty.destinationAddress,
    provenancePresent: Boolean(counterparty.apiUrl && bitcoin.sourceUrl)
  }

  const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name)
  const hardFailures = failed.filter(name =>
    ['transactionIdentity', 'nomniAsset', 'counterpartyValid', 'blockReconciled', 'eventTypeReconciled', 'sourceReconciled', 'destinationReconciled'].includes(name)
  )

  if (hardFailures.length > 0) {
    return {
      status: 'REJECTED',
      checks,
      reasons: hardFailures.map(name => `Counterparty Core reconciliation failed check: ${name}.`)
    }
  }

  if (failed.length > 0) {
    return {
      status: 'REVIEW',
      checks,
      reasons: failed.map(name => `Counterparty Core reconciliation requires review: ${name}.`)
    }
  }

  const txHash = event.txHash
  if (!txHash) {
    return {
      status: 'REJECTED',
      checks: { ...checks, transactionIdentity: false },
      reasons: ['NOMNI lineage event has no transaction hash to reconcile.']
    }
  }

  const decodedQuantity = counterparty.quantity === undefined ? event.quantity : Number(counterparty.quantity)
  if (decodedQuantity !== undefined && !Number.isFinite(decodedQuantity)) {
    return {
      status: 'REVIEW',
      checks: { ...checks, quantityValid: false },
      reasons: ['Counterparty Core quantity could not be normalized to a finite number.']
    }
  }

  const proof: NomniTransactionProof = {
    txHash,
    blockIndex: event.blockIndex ?? counterparty.blockIndex ?? bitcoin.blockIndex,
    blockTime: event.blockTime ?? counterparty.blockTime,
    sourceAddress: counterparty.sourceAddress ?? event.sourceAddress,
    destinationAddress: counterparty.destinationAddress ?? event.destinationAddress,
    asset: 'NOMNI',
    eventType: event.eventType,
    quantity: decodedQuantity,
    decodedBy: [counterparty.coreVersion ? `Counterparty Core ${counterparty.coreVersion}` : 'Counterparty Core'],
    rawSourceUrls: stableUnique([counterparty.apiUrl, bitcoin.sourceUrl, ...event.sourceUrls]),
    counterpartyConfirmed: true,
    bitcoinConfirmed: true
  }

  return {
    status: 'RECONCILED',
    proof,
    checks,
    reasons: ['Counterparty Core decoding and the underlying Bitcoin transaction reconcile with the NOMNI lineage event.']
  }
}

export const nomniCounterpartyCoreReconciliationGateV1 = {
  id: 'NEO-NOMNI-COUNTERPARTY-CORE-RECONCILIATION-GATE',
  version: '1.0.1',
  purpose: 'Convert direct Counterparty Core decoding plus an underlying Bitcoin transaction anchor into a NOMNI transaction proof without trusting third-party explorer labels as protocol truth.',
  principles: [
    'Counterparty Core is treated as the Counterparty protocol decoding source; the underlying Bitcoin transaction remains an independent anchoring requirement.',
    'Transaction hash, NOMNI asset identity, validity, block chronology, event type, and known address roles must reconcile before proof is emitted.',
    'A Counterparty API response without Bitcoin confirmation cannot produce a transaction-verification proof.',
    'Explorer, mirror, market, and index data may corroborate but do not replace Core decoding plus Bitcoin anchoring.',
    'Issuer, owner, source, destination, grantor, and grantee roles remain distinct and are never inferred from labels alone.',
    'Rejected or incomplete reconciliation never silently promotes a lineage event to VERIFIED.'
  ],
  reconcileNomniCounterpartyCoreEvent
} as const
