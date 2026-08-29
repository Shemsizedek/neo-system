import type { CesRecordKind } from './types'

const DEFAULT_ALLOWED: CesRecordKind[] = ['EXCHANGE', 'OFFER', 'WANT', 'BALANCE', 'ACTIVITY', 'TRANSACTION']

export type CesCollectionPolicy = {
  allowedKinds: CesRecordKind[]
  denyMemberPrivateFields: boolean
  maxRowsPerKind: number
  requireExchangeMatch: boolean
}

export const defaultCesCollectionPolicy: CesCollectionPolicy = {
  allowedKinds: DEFAULT_ALLOWED,
  denyMemberPrivateFields: true,
  maxRowsPerKind: 5_000,
  requireExchangeMatch: true
}

export function assertKindAllowed(policy: CesCollectionPolicy, kind: CesRecordKind) {
  if (!policy.allowedKinds.includes(kind)) throw new Error(`CES collection kind is not allowed: ${kind}`)
}
