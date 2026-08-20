import type { CesCoordinatorAgent, CesDataClass, CesPermission, CesRecordKind } from './types'

const permissionForRecord: Record<CesRecordKind, CesPermission> = {
  EXCHANGE: 'READ_EXCHANGE',
  OFFER: 'READ_MARKET',
  WANT: 'READ_MARKET',
  BALANCE: 'READ_BALANCES',
  ACTIVITY: 'READ_ACTIVITY',
  TRANSACTION: 'READ_TRANSACTIONS'
}

export function canRead(agent: CesCoordinatorAgent, kind: CesRecordKind) {
  return agent.permissions.includes(permissionForRecord[kind])
}

export function canWrite(agent: CesCoordinatorAgent, permission: CesPermission) {
  return agent.writeEnabled && agent.permissions.includes(permission)
}

export function classifyCesData(kind: CesRecordKind): CesDataClass {
  if (kind === 'EXCHANGE' || kind === 'OFFER' || kind === 'WANT') return 'PUBLIC'
  return 'AUTHORIZED'
}

export function assertNoSensitivePayload(payload: Record<string, unknown>) {
  const forbidden = [
    'password',
    'passwd',
    'privateKey',
    'private_key',
    'seed',
    'mnemonic',
    'secret',
    'token',
    'sessionCookie',
    'cookie'
  ]

  const present = forbidden.filter((field) => field in payload)
  if (present.length > 0) {
    throw new Error(`Sensitive CES fields rejected: ${present.join(', ')}`)
  }
}
