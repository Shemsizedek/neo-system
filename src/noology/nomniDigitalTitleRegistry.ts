import type { NomniLineageEvent } from './nomniBlockchainLineage'
import type { NomniTransactionProof } from './nomniTransactionVerificationGate'
import { verifyNomniLineageEvent } from './nomniTransactionVerificationGate'
import { NOMNI_ISSUER_ADDRESS, NOMNI_OWNER_ADDRESS, NOMNI_SUPPLY } from './nomniProvenanceEngine'

export type NomniTitleStatus = 'VERIFIED_TITLE' | 'PROVISIONAL' | 'CONFLICT' | 'UNRESOLVED'

export type NomniTitleInstrument = {
  eventId: string
  txHash: string
  blockIndex?: number
  blockTime?: string
  grantor?: string
  grantee?: string
  sourceUrls: string[]
}

export type NomniDigitalTitle = {
  asset: 'NOMNI'
  status: NomniTitleStatus
  issuerAddress: string
  assertedOwnerAddress: string
  verifiedOwnerAddress?: string
  supply: number
  divisible: false
  locked: true
  instruments: NomniTitleInstrument[]
  unresolved: string[]
  warnings: string[]
}

export type NomniTitleEvidence = {
  event: NomniLineageEvent
  proof?: NomniTransactionProof
}

export function buildNomniDigitalTitleRegistry(evidence: NomniTitleEvidence[]): NomniDigitalTitle {
  const warnings: string[] = []
  const unresolved: string[] = []
  const instruments: NomniTitleInstrument[] = []
  let verifiedOwnerAddress: string | undefined

  const verifiedTransfers = evidence
    .filter(({ event }) => event.eventType === 'OWNERSHIP_TRANSFER')
    .filter(({ event, proof }) => verifyNomniLineageEvent(event, proof).promotableToVerified)
    .sort((a, b) => (a.event.blockIndex ?? Number.MAX_SAFE_INTEGER) - (b.event.blockIndex ?? Number.MAX_SAFE_INTEGER))

  for (const { event, proof } of verifiedTransfers) {
    if (!proof) continue
    const grantor = event.ownerBefore ?? proof.sourceAddress
    const grantee = event.ownerAfter ?? proof.destinationAddress
    if (!grantee) {
      warnings.push(`${event.id} passed transaction verification but has no determinable grantee.`)
      continue
    }
    if (verifiedOwnerAddress && grantor && grantor !== verifiedOwnerAddress) {
      warnings.push(`${event.id} breaks title continuity: grantor ${grantor} does not equal prior verified owner ${verifiedOwnerAddress}.`)
    }
    verifiedOwnerAddress = grantee
    instruments.push({
      eventId: event.id,
      txHash: proof.txHash,
      blockIndex: proof.blockIndex,
      blockTime: proof.blockTime,
      grantor,
      grantee,
      sourceUrls: [...new Set([...event.sourceUrls, ...proof.rawSourceUrls])]
    })
  }

  if (verifiedTransfers.length === 0) {
    unresolved.push(`No transaction-verified ownership-transfer instrument currently establishes title from ${NOMNI_ISSUER_ADDRESS} to ${NOMNI_OWNER_ADDRESS}.`)
  }
  if (verifiedOwnerAddress && verifiedOwnerAddress !== NOMNI_OWNER_ADDRESS) {
    warnings.push(`Verified chain terminates at ${verifiedOwnerAddress}, while the supplied current metadata asserts owner ${NOMNI_OWNER_ADDRESS}.`)
  }

  const continuityConflict = warnings.some(warning => warning.includes('breaks title continuity'))
  const status: NomniTitleStatus = continuityConflict
    ? 'CONFLICT'
    : verifiedOwnerAddress === NOMNI_OWNER_ADDRESS
      ? 'VERIFIED_TITLE'
      : verifiedOwnerAddress
        ? 'PROVISIONAL'
        : 'UNRESOLVED'

  return {
    asset: 'NOMNI',
    status,
    issuerAddress: NOMNI_ISSUER_ADDRESS,
    assertedOwnerAddress: NOMNI_OWNER_ADDRESS,
    verifiedOwnerAddress,
    supply: NOMNI_SUPPLY,
    divisible: false,
    locked: true,
    instruments,
    unresolved,
    warnings
  }
}

export const nomniDigitalTitleRegistryV1 = {
  id: 'NEO-NOMNI-DIGITAL-TITLE-REGISTRY',
  version: '1.0.0',
  purpose: 'Convert transaction-verified NOMNI lineage events into a canonical digital chain of title without treating metadata assertions, mirrors, possession, or unverified transfers as verified title.',
  gate: 'Only ownership-transfer events that pass the NOMNI Transaction Verification Gate may become title instruments.',
  principles: [
    'Title continuity requires each verified grantor to reconcile with the prior verified owner.',
    'Current metadata may assert an owner but does not independently prove the historical chain of title.',
    'Issuer, owner, grantor, grantee, source, and destination remain distinct legal/data roles.',
    'Missing instruments remain unresolved; they are never reconstructed by inference.',
    'Conflicting verified instruments force CONFLICT status rather than silent reconciliation.'
  ],
  buildNomniDigitalTitleRegistry
} as const
