import type {
  NomniStateTransitionProposal,
  NomniStateTransitionAuthorityResult,
  NomniStateTransitionType
} from './nomniStateTransitionAuthorityGate'

export type NomniExecutionConfirmation = {
  txHash: string
  blockIndex?: number
  blockTime?: string
  eventType: NomniStateTransitionType
  sourceAddress?: string
  destinationAddress?: string
  affectedRightId?: string
  description?: string
  counterpartyConfirmed: boolean
  bitcoinConfirmed: boolean
  decodedBy: string
  rawSourceUrls: string[]
}

export type NomniExecutionReconciliationStatus =
  | 'COMMIT'
  | 'REJECT'
  | 'REVIEW'
  | 'PENDING'

export type NomniCanonicalStateMutation = {
  transitionId: string
  type: NomniStateTransitionType
  txHash: string
  blockIndex?: number
  blockTime?: string
  fromOwnerAddress?: string
  toOwnerAddress?: string
  affectedRightId?: string
  description: string
  evidenceRefs: string[]
  committedAt: string
}

export type NomniExecutionReconciliationResult = {
  status: NomniExecutionReconciliationStatus
  transitionId: string
  canonicalCommitEligible: boolean
  reasons: string[]
  mutation?: NomniCanonicalStateMutation
}

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function normalized(value?: string): string | undefined {
  return value?.trim() || undefined
}

export function reconcileNomniStateTransitionExecution(input: {
  proposal: NomniStateTransitionProposal
  authority: NomniStateTransitionAuthorityResult
  execution?: NomniExecutionConfirmation
  committedAt?: string
}): NomniExecutionReconciliationResult {
  const reasons: string[] = []

  if (input.authority.transitionId !== input.proposal.id) {
    reasons.push(`Authority result ${input.authority.transitionId} does not belong to proposal ${input.proposal.id}.`)
  }
  if (input.authority.status !== 'AUTHORIZED' || !input.authority.canonicalStateMutationEligible) {
    reasons.push(`Transition authority status is ${input.authority.status}; execution cannot enter canonical state.`)
  }

  if (!input.execution) {
    return {
      status: reasons.length > 0 ? 'REJECT' : 'PENDING',
      transitionId: input.proposal.id,
      canonicalCommitEligible: false,
      reasons: reasons.length > 0 ? stableUnique(reasons) : ['Authorized transition has no confirmed blockchain execution yet.']
    }
  }

  const execution = input.execution
  if (!execution.counterpartyConfirmed) reasons.push('Counterparty execution is not confirmed.')
  if (!execution.bitcoinConfirmed) reasons.push('Underlying Bitcoin transaction is not confirmed.')
  if (!execution.decodedBy.trim()) reasons.push('Execution has no decoder provenance.')
  if (execution.rawSourceUrls.length === 0) reasons.push('Execution has no raw source provenance.')
  if (execution.eventType !== input.proposal.type) reasons.push(`Executed event ${execution.eventType} does not match authorized event ${input.proposal.type}.`)

  if (input.proposal.proposedTxHash && execution.txHash !== input.proposal.proposedTxHash) {
    reasons.push(`Executed transaction ${execution.txHash} does not match authorized transaction ${input.proposal.proposedTxHash}.`)
  }

  if (input.proposal.actorAddress && execution.sourceAddress && execution.sourceAddress !== input.proposal.actorAddress) {
    reasons.push(`Execution source ${execution.sourceAddress} does not match authorized actor ${input.proposal.actorAddress}.`)
  }

  if (input.proposal.type === 'OWNERSHIP_TRANSFER') {
    if (!execution.sourceAddress) reasons.push('Ownership-transfer execution has no decoded source address.')
    if (!execution.destinationAddress) reasons.push('Ownership-transfer execution has no decoded destination address.')
    if (input.proposal.fromOwnerAddress && execution.sourceAddress !== input.proposal.fromOwnerAddress) {
      reasons.push(`Executed grantor ${execution.sourceAddress ?? 'UNKNOWN'} does not match authorized grantor ${input.proposal.fromOwnerAddress}.`)
    }
    if (input.proposal.toOwnerAddress && execution.destinationAddress !== input.proposal.toOwnerAddress) {
      reasons.push(`Executed grantee ${execution.destinationAddress ?? 'UNKNOWN'} does not match authorized grantee ${input.proposal.toOwnerAddress}.`)
    }
  }

  if (input.proposal.affectedRightId && execution.affectedRightId !== input.proposal.affectedRightId) {
    reasons.push(`Executed right ${execution.affectedRightId ?? 'UNKNOWN'} does not match authorized right ${input.proposal.affectedRightId}.`)
  }

  const hardMismatch = reasons.some(reason =>
    reason.includes('does not belong') ||
    reason.includes('cannot enter canonical') ||
    reason.includes('does not match authorized') ||
    reason.includes('Executed event') ||
    reason.includes('Executed transaction')
  )
  const incompleteProof = reasons.length > 0 && !hardMismatch
  const status: NomniExecutionReconciliationStatus = hardMismatch ? 'REJECT' : incompleteProof ? 'REVIEW' : 'COMMIT'

  const mutation: NomniCanonicalStateMutation | undefined = status === 'COMMIT'
    ? {
        transitionId: input.proposal.id,
        type: input.proposal.type,
        txHash: execution.txHash,
        blockIndex: execution.blockIndex,
        blockTime: execution.blockTime,
        fromOwnerAddress: input.proposal.type === 'OWNERSHIP_TRANSFER' ? execution.sourceAddress : input.proposal.fromOwnerAddress,
        toOwnerAddress: input.proposal.type === 'OWNERSHIP_TRANSFER' ? execution.destinationAddress : input.proposal.toOwnerAddress,
        affectedRightId: execution.affectedRightId ?? input.proposal.affectedRightId,
        description: normalized(execution.description) ?? input.proposal.description,
        evidenceRefs: stableUnique([...input.proposal.evidenceRefs, ...input.authority.evidenceIds, ...execution.rawSourceUrls]),
        committedAt: input.committedAt ?? new Date().toISOString()
      }
    : undefined

  return {
    status,
    transitionId: input.proposal.id,
    canonicalCommitEligible: status === 'COMMIT',
    reasons: status === 'COMMIT'
      ? ['Authorized proposal and confirmed Counterparty/Bitcoin execution reconcile; canonical state mutation is eligible.']
      : stableUnique(reasons),
    mutation
  }
}

export function validateNomniCanonicalMutationLedger(mutations: NomniCanonicalStateMutation[]): string[] {
  const issues: string[] = []
  const transitionIds = new Set<string>()
  const txHashes = new Map<string, NomniCanonicalStateMutation[]>()

  for (const mutation of mutations) {
    if (transitionIds.has(mutation.transitionId)) issues.push(`Transition ${mutation.transitionId} appears more than once in the canonical mutation ledger.`)
    transitionIds.add(mutation.transitionId)
    const bucket = txHashes.get(mutation.txHash) ?? []
    bucket.push(mutation)
    txHashes.set(mutation.txHash, bucket)
    if (mutation.type === 'OWNERSHIP_TRANSFER' && (!mutation.fromOwnerAddress || !mutation.toOwnerAddress)) {
      issues.push(`Ownership transition ${mutation.transitionId} lacks a complete grantor/grantee pair.`)
    }
  }

  for (const [txHash, bucket] of txHashes) {
    const signatures = new Set(bucket.map(item => `${item.type}|${item.fromOwnerAddress ?? ''}|${item.toOwnerAddress ?? ''}|${item.affectedRightId ?? ''}`))
    if (signatures.size > 1) issues.push(`Transaction ${txHash} is assigned to conflicting canonical mutations.`)
  }

  return stableUnique(issues)
}

export const nomniStateTransitionExecutionReconciliationGateV1 = {
  id: 'NEO-NOMNI-STATE-TRANSITION-EXECUTION-RECONCILIATION-GATE',
  version: '1.0.0',
  purpose: 'Prevent an authorized NOMNI state-transition proposal from becoming canonical unless its actual Counterparty/Bitcoin execution independently reconciles with the authorized action.',
  principles: [
    'Authorization and execution are separate facts; authorization alone never proves execution.',
    'Canonical mutation requires both Counterparty decoding and underlying Bitcoin confirmation.',
    'Executed event type, transaction, actor, ownership endpoints, and affected rights must reconcile with the authorized proposal where specified.',
    'Execution mismatch is rejected rather than rewritten to fit prior authorization.',
    'Incomplete execution evidence remains REVIEW or PENDING and cannot mutate canonical state.',
    'Committed mutations preserve transaction, block, provenance, and authorization evidence references.'
  ],
  reconcileNomniStateTransitionExecution,
  validateNomniCanonicalMutationLedger
} as const
