import type { NomniDigitalTitle, NomniTitleInstrument } from './nomniDigitalTitleRegistry'

export type NomniTitleConflictKind =
  | 'BROKEN_CONTINUITY'
  | 'DIVERGENT_TERMINAL_OWNER'
  | 'DUPLICATE_TX_CONFLICT'
  | 'IMPOSSIBLE_CHRONOLOGY'
  | 'MISSING_GRANTOR'
  | 'MISSING_GRANTEE'
  | 'DUPLICATE_INSTRUMENT'
  | 'UNRESOLVED_GAP'

export type NomniTitleConflict = {
  id: string
  kind: NomniTitleConflictKind
  severity: 'BLOCKING' | 'REVIEW'
  instrumentIds: string[]
  message: string
}

export type NomniTitleConflictGateResult = {
  status: 'CLEAN' | 'REVIEW' | 'CONFLICT'
  cleanTitleEligible: boolean
  conflicts: NomniTitleConflict[]
  terminalOwner?: string
  instrumentCount: number
}

function canonicalInstrumentKey(instrument: NomniTitleInstrument): string {
  return [instrument.txHash, instrument.grantor ?? '', instrument.grantee ?? '', instrument.blockIndex ?? ''].join('|')
}

export function evaluateNomniTitleConflicts(title: NomniDigitalTitle): NomniTitleConflictGateResult {
  const conflicts: NomniTitleConflict[] = []
  const instruments = [...title.instruments].sort((a, b) => (a.blockIndex ?? Number.MAX_SAFE_INTEGER) - (b.blockIndex ?? Number.MAX_SAFE_INTEGER))
  const seenInstrumentKeys = new Map<string, NomniTitleInstrument>()
  const seenTxHashes = new Map<string, NomniTitleInstrument>()

  let priorOwner: string | undefined
  let priorBlock: number | undefined

  for (const instrument of instruments) {
    if (!instrument.grantor) {
      conflicts.push({ id: `NOMNI-TITLE-${instrument.eventId}-NO-GRANTOR`, kind: 'MISSING_GRANTOR', severity: 'REVIEW', instrumentIds: [instrument.eventId], message: `${instrument.eventId} has no determinable grantor.` })
    }
    if (!instrument.grantee) {
      conflicts.push({ id: `NOMNI-TITLE-${instrument.eventId}-NO-GRANTEE`, kind: 'MISSING_GRANTEE', severity: 'BLOCKING', instrumentIds: [instrument.eventId], message: `${instrument.eventId} has no determinable grantee.` })
    }

    if (priorOwner && instrument.grantor && instrument.grantor !== priorOwner) {
      conflicts.push({ id: `NOMNI-TITLE-${instrument.eventId}-CONTINUITY`, kind: 'BROKEN_CONTINUITY', severity: 'BLOCKING', instrumentIds: [instrument.eventId], message: `${instrument.eventId} grantor ${instrument.grantor} does not equal prior verified owner ${priorOwner}.` })
    }

    if (priorBlock !== undefined && instrument.blockIndex !== undefined && instrument.blockIndex < priorBlock) {
      conflicts.push({ id: `NOMNI-TITLE-${instrument.eventId}-CHRONOLOGY`, kind: 'IMPOSSIBLE_CHRONOLOGY', severity: 'BLOCKING', instrumentIds: [instrument.eventId], message: `${instrument.eventId} precedes a prior instrument after canonical sorting.` })
    }

    const key = canonicalInstrumentKey(instrument)
    const duplicate = seenInstrumentKeys.get(key)
    if (duplicate) {
      conflicts.push({ id: `NOMNI-TITLE-${instrument.eventId}-DUPLICATE`, kind: 'DUPLICATE_INSTRUMENT', severity: 'REVIEW', instrumentIds: [duplicate.eventId, instrument.eventId], message: `${instrument.eventId} duplicates an existing title instrument.` })
    } else {
      seenInstrumentKeys.set(key, instrument)
    }

    const sameTx = seenTxHashes.get(instrument.txHash)
    if (sameTx && (sameTx.grantor !== instrument.grantor || sameTx.grantee !== instrument.grantee || sameTx.blockIndex !== instrument.blockIndex)) {
      conflicts.push({ id: `NOMNI-TITLE-${instrument.eventId}-TX-CONFLICT`, kind: 'DUPLICATE_TX_CONFLICT', severity: 'BLOCKING', instrumentIds: [sameTx.eventId, instrument.eventId], message: `Transaction ${instrument.txHash} appears in incompatible title instruments.` })
    } else if (!sameTx) {
      seenTxHashes.set(instrument.txHash, instrument)
    }

    if (instrument.grantee) priorOwner = instrument.grantee
    if (instrument.blockIndex !== undefined) priorBlock = instrument.blockIndex
  }

  if (title.unresolved.length > 0) {
    conflicts.push({ id: 'NOMNI-TITLE-UNRESOLVED-GAP', kind: 'UNRESOLVED_GAP', severity: 'REVIEW', instrumentIds: [], message: title.unresolved.join(' ') })
  }

  if (title.verifiedOwnerAddress && priorOwner && title.verifiedOwnerAddress !== priorOwner) {
    conflicts.push({ id: 'NOMNI-TITLE-TERMINAL-OWNER-CONFLICT', kind: 'DIVERGENT_TERMINAL_OWNER', severity: 'BLOCKING', instrumentIds: instruments.map(instrument => instrument.eventId), message: `Registry verified owner ${title.verifiedOwnerAddress} does not equal terminal instrument owner ${priorOwner}.` })
  }

  const hasBlocking = conflicts.some(conflict => conflict.severity === 'BLOCKING')
  const hasReview = conflicts.some(conflict => conflict.severity === 'REVIEW')
  const status: NomniTitleConflictGateResult['status'] = hasBlocking ? 'CONFLICT' : hasReview ? 'REVIEW' : 'CLEAN'

  return {
    status,
    cleanTitleEligible: status === 'CLEAN' && title.status === 'VERIFIED_TITLE',
    conflicts,
    terminalOwner: priorOwner,
    instrumentCount: instruments.length
  }
}

export const nomniTitleConflictGateV1 = {
  id: 'NEO-NOMNI-TITLE-CONFLICT-GATE',
  version: '1.0.0',
  purpose: 'Adversarially test a transaction-verified NOMNI chain of title before it can be treated as clean digital title.',
  principles: [
    'Verified evidence is still subject to adversarial continuity testing.',
    'A blockchain transaction does not cure a broken grantor/grantee chain.',
    'Conflicting uses of the same transaction hash are blocking until reconciled.',
    'Missing title instruments remain visible as unresolved gaps.',
    'CLEAN means internally continuous and conflict-free; it is not a court judgment or universal legal determination.'
  ],
  evaluateNomniTitleConflicts
} as const
