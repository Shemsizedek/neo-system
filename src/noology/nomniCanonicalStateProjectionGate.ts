import type { NomniCanonicalStateMutation } from './nomniStateTransitionExecutionReconciliationGate'
import type { NomniDigitalTitle } from './nomniDigitalTitleRegistry'
import type { NomniInterestRecord } from './nomniEncumbranceRightsGate'

export type NomniCanonicalState = {
  asset: 'NOMNI'
  ownerAddress?: string
  locked: boolean
  description?: string
  activeRights: Record<string, NomniInterestRecord>
  delegations: Record<string, { holder?: string; sourceMutationId: string }>
  governanceEvents: string[]
  appliedMutationIds: string[]
  appliedTransactionHashes: string[]
  provenanceRefs: string[]
  lastBlockIndex?: number
}

export type NomniCanonicalProjectionResult = {
  status: 'PROJECTED' | 'REJECTED' | 'REVIEW'
  state?: NomniCanonicalState
  reasons: string[]
  appliedMutationIds: string[]
}

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function cloneRights(rights: Record<string, NomniInterestRecord>): Record<string, NomniInterestRecord> {
  return Object.fromEntries(Object.entries(rights).map(([id, value]) => [id, { ...value, sourceUrls: [...value.sourceUrls], notes: [...value.notes] }]))
}

function initialState(input: { title: NomniDigitalTitle; interests?: NomniInterestRecord[] }): NomniCanonicalState {
  const activeRights: Record<string, NomniInterestRecord> = {}
  for (const interest of input.interests ?? []) {
    if (interest.status !== 'RELEASED' && interest.releasedBlock === undefined) activeRights[interest.id] = { ...interest, sourceUrls: [...interest.sourceUrls], notes: [...interest.notes] }
  }
  return {
    asset: 'NOMNI',
    ownerAddress: input.title.verifiedOwnerAddress,
    locked: input.title.locked,
    activeRights,
    delegations: {},
    governanceEvents: [],
    appliedMutationIds: [],
    appliedTransactionHashes: [],
    provenanceRefs: stableUnique([
      ...input.title.instruments.flatMap(instrument => instrument.sourceUrls),
      ...(input.interests ?? []).flatMap(interest => interest.sourceUrls)
    ])
  }
}

export function projectNomniCanonicalState(input: {
  title: NomniDigitalTitle
  interests?: NomniInterestRecord[]
  mutations: NomniCanonicalStateMutation[]
}): NomniCanonicalProjectionResult {
  const reasons: string[] = []
  const state = initialState({ title: input.title, interests: input.interests })
  state.activeRights = cloneRights(state.activeRights)

  const mutations = [...input.mutations].sort((a, b) =>
    (a.blockIndex ?? Number.MAX_SAFE_INTEGER) - (b.blockIndex ?? Number.MAX_SAFE_INTEGER) ||
    a.committedAt.localeCompare(b.committedAt) ||
    a.transitionId.localeCompare(b.transitionId)
  )

  const seenTransitions = new Set<string>()
  let priorBlock = state.lastBlockIndex

  for (const mutation of mutations) {
    if (seenTransitions.has(mutation.transitionId)) {
      reasons.push(`Transition ${mutation.transitionId} appears more than once in projection input.`)
      continue
    }
    seenTransitions.add(mutation.transitionId)

    if (priorBlock !== undefined && mutation.blockIndex !== undefined && mutation.blockIndex < priorBlock) {
      reasons.push(`Mutation ${mutation.transitionId} violates canonical block chronology.`)
      continue
    }

    switch (mutation.type) {
      case 'OWNERSHIP_TRANSFER': {
        if (!mutation.fromOwnerAddress || !mutation.toOwnerAddress) {
          reasons.push(`Ownership mutation ${mutation.transitionId} lacks grantor or grantee.`)
          break
        }
        if (state.ownerAddress && mutation.fromOwnerAddress !== state.ownerAddress) {
          reasons.push(`Ownership mutation ${mutation.transitionId} grantor ${mutation.fromOwnerAddress} does not match projected owner ${state.ownerAddress}.`)
          break
        }
        state.ownerAddress = mutation.toOwnerAddress
        break
      }
      case 'LOCK':
        state.locked = true
        break
      case 'UNLOCK':
        state.locked = false
        break
      case 'RIGHT_GRANT': {
        if (!mutation.affectedRightId) {
          reasons.push(`Right-grant mutation ${mutation.transitionId} has no affected right id.`)
          break
        }
        state.activeRights[mutation.affectedRightId] = {
          id: mutation.affectedRightId,
          type: 'OTHER',
          status: 'VERIFIED',
          scope: mutation.description,
          blocksTransfer: false,
          blocksCleanTitle: false,
          effectiveBlock: mutation.blockIndex,
          sourceUrls: [...mutation.evidenceRefs],
          notes: [`Projected from canonical mutation ${mutation.transitionId}.`]
        }
        break
      }
      case 'RIGHT_RELEASE': {
        if (!mutation.affectedRightId) {
          reasons.push(`Right-release mutation ${mutation.transitionId} has no affected right id.`)
          break
        }
        if (!state.activeRights[mutation.affectedRightId]) {
          reasons.push(`Right-release mutation ${mutation.transitionId} references unknown active right ${mutation.affectedRightId}.`)
          break
        }
        delete state.activeRights[mutation.affectedRightId]
        break
      }
      case 'DELEGATION': {
        const key = mutation.affectedRightId ?? mutation.transitionId
        state.delegations[key] = { holder: mutation.toOwnerAddress, sourceMutationId: mutation.transitionId }
        break
      }
      case 'DELEGATION_REVOKE': {
        const key = mutation.affectedRightId ?? mutation.transitionId
        if (!state.delegations[key]) reasons.push(`Delegation-revoke mutation ${mutation.transitionId} references no active delegation ${key}.`)
        else delete state.delegations[key]
        break
      }
      case 'GOVERNANCE_ACTION':
        state.governanceEvents.push(mutation.transitionId)
        break
      case 'DESCRIPTION_CHANGE':
        state.description = mutation.description
        break
      case 'OTHER':
        break
    }

    if (!reasons.some(reason => reason.includes(mutation.transitionId))) {
      state.appliedMutationIds.push(mutation.transitionId)
      state.appliedTransactionHashes.push(mutation.txHash)
      state.provenanceRefs.push(...mutation.evidenceRefs)
      if (mutation.blockIndex !== undefined) {
        state.lastBlockIndex = mutation.blockIndex
        priorBlock = mutation.blockIndex
      }
    }
  }

  state.appliedMutationIds = stableUnique(state.appliedMutationIds)
  state.appliedTransactionHashes = stableUnique(state.appliedTransactionHashes)
  state.provenanceRefs = stableUnique(state.provenanceRefs)
  state.governanceEvents = stableUnique(state.governanceEvents)

  const blocking = reasons.some(reason =>
    reason.includes('grantor') ||
    reason.includes('chronology') ||
    reason.includes('lacks grantor or grantee') ||
    reason.includes('appears more than once')
  )
  const status: NomniCanonicalProjectionResult['status'] = blocking ? 'REJECTED' : reasons.length > 0 ? 'REVIEW' : 'PROJECTED'

  return {
    status,
    state: status === 'REJECTED' ? undefined : state,
    reasons: reasons.length > 0 ? stableUnique(reasons) : ['Committed mutations project deterministically from the prior canonical NOMNI state.'],
    appliedMutationIds: state.appliedMutationIds
  }
}

export const nomniCanonicalStateProjectionGateV1 = {
  id: 'NEO-NOMNI-CANONICAL-STATE-PROJECTION-GATE',
  version: '1.0.0',
  purpose: 'Deterministically project the next canonical NOMNI ownership, lock, rights, delegation, governance, and descriptive state from execution-reconciled committed mutations only.',
  principles: [
    'Only COMMIT-eligible canonical mutations may enter projection input.',
    'Projection is deterministic and ordered by blockchain chronology before local commit time.',
    'Ownership continuity must hold at every projected transfer.',
    'Rejected, pending, or review-state transitions never mutate canonical state.',
    'Rights, delegation, governance, lock, owner, and descriptive state remain distinct dimensions.',
    'Projection preserves transaction and provenance references for later recertification and audit.'
  ],
  projectNomniCanonicalState
} as const
