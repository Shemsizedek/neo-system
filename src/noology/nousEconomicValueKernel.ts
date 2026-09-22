import { calculateWorldCreditClock, type WorldCreditClockConfig, type WorldCreditClockSnapshot } from './worldCreditClock'

export type NousValueClass =
  | 'NOMNI_MODELED_CREDIT'
  | 'INTERNAL_MUTUAL_CREDIT'
  | 'DOCUMENTED_ASSET'
  | 'DOCUMENTED_LIABILITY'
  | 'CLAIMED_RECEIVABLE'
  | 'AGREED_OBLIGATION'
  | 'ADJUDICATED_OBLIGATION'
  | 'EXTERNAL_SETTLEMENT'
  | 'REVENUE'
  | 'EXPENSE'
  | 'RESERVE'

export type NousValueStatus =
  | 'MODELED'
  | 'INTERNAL'
  | 'DOCUMENTED'
  | 'CLAIMED'
  | 'AGREED'
  | 'ADJUDICATED'
  | 'SETTLED'

export type NousValueEvent = {
  id: string
  occurredAt: Date
  valueClass: NousValueClass
  status: NousValueStatus
  amount: bigint
  unit: string
  debitAccountId?: string
  creditAccountId?: string
  provenanceRecordIds: string[]
  authorityRecordIds?: string[]
  memo?: string
}

export type NousTreasuryAccount = {
  id: string
  name: string
  unit: string
  permittedClasses: NousValueClass[]
  reserve?: boolean
}

export type NousEconomicLedger = {
  id: string
  unit: string
  accounts: NousTreasuryAccount[]
  events: NousValueEvent[]
}

export type NousLedgerBalance = {
  accountId: string
  unit: string
  debits: bigint
  credits: bigint
  balance: bigint
}

export type NousEconomicSnapshot = {
  asOf: Date
  ledgerId: string
  balances: NousLedgerBalance[]
  worldCreditClock?: WorldCreditClockSnapshot
  invariants: readonly string[]
}

export const NOUS_ECONOMIC_INVARIANTS = [
  'Internal or modeled value is not silently represented as fiat money, market value, external property, or legally enforceable debt.',
  'Every ledger event carries a value class, status, unit, timestamp, and provenance.',
  'Claimed, agreed, adjudicated, and settled obligations remain distinct states.',
  'External assets and liabilities require documentary provenance before they enter documented ledger classes.',
  'Treasury execution does not create authority; authority is resolved by the governance and capability layers.'
] as const

function assertNonNegative(amount: bigint): void {
  if (amount < 0n) throw new RangeError('ledger event amount must be non-negative')
}

function accountById(ledger: NousEconomicLedger, id: string): NousTreasuryAccount {
  const account = ledger.accounts.find(candidate => candidate.id === id)
  if (!account) throw new Error(`unknown treasury account: ${id}`)
  return account
}

export function validateNousValueEvent(ledger: NousEconomicLedger, event: NousValueEvent): void {
  assertNonNegative(event.amount)
  if (event.unit !== ledger.unit) throw new Error('event unit must match ledger unit')
  if (!event.debitAccountId && !event.creditAccountId) {
    throw new Error('event must identify at least one debit or credit account')
  }
  for (const accountId of [event.debitAccountId, event.creditAccountId]) {
    if (!accountId) continue
    const account = accountById(ledger, accountId)
    if (account.unit !== event.unit) throw new Error('account unit must match event unit')
    if (!account.permittedClasses.includes(event.valueClass)) {
      throw new Error(`value class ${event.valueClass} is not permitted for account ${account.id}`)
    }
  }
  if (event.provenanceRecordIds.length === 0) {
    throw new Error('ledger event requires provenance')
  }
}

export function postNousValueEvent(ledger: NousEconomicLedger, event: NousValueEvent): NousEconomicLedger {
  validateNousValueEvent(ledger, event)
  if (ledger.events.some(existing => existing.id === event.id)) {
    throw new Error(`duplicate ledger event: ${event.id}`)
  }
  return { ...ledger, events: [...ledger.events, event] }
}

export function reconcileNousLedger(ledger: NousEconomicLedger, asOf: Date = new Date()): NousLedgerBalance[] {
  const totals = new Map<string, { debits: bigint; credits: bigint }>()
  for (const account of ledger.accounts) totals.set(account.id, { debits: 0n, credits: 0n })

  for (const event of ledger.events) {
    if (event.occurredAt.getTime() > asOf.getTime()) continue
    validateNousValueEvent(ledger, event)
    if (event.debitAccountId) totals.get(event.debitAccountId)!.debits += event.amount
    if (event.creditAccountId) totals.get(event.creditAccountId)!.credits += event.amount
  }

  return ledger.accounts.map(account => {
    const total = totals.get(account.id)!
    return {
      accountId: account.id,
      unit: account.unit,
      debits: total.debits,
      credits: total.credits,
      balance: total.credits - total.debits
    }
  })
}

export function createNousEconomicSnapshot(
  ledger: NousEconomicLedger,
  asOf: Date = new Date(),
  worldCreditClockConfig?: WorldCreditClockConfig
): NousEconomicSnapshot {
  return {
    asOf,
    ledgerId: ledger.id,
    balances: reconcileNousLedger(ledger, asOf),
    worldCreditClock: worldCreditClockConfig
      ? calculateWorldCreditClock(worldCreditClockConfig, asOf)
      : undefined,
    invariants: NOUS_ECONOMIC_INVARIANTS
  }
}

/**
 * Converts a World Credit Clock snapshot into an explicitly modeled NOMNI
 * ledger event. This does not convert NOMNI into fiat value or an external
 * receivable.
 */
export function worldCreditClockValueEvent(
  snapshot: WorldCreditClockSnapshot,
  creditAccountId: string,
  provenanceRecordIds: string[]
): NousValueEvent {
  return {
    id: `WCC-${snapshot.asOf.toISOString()}`,
    occurredAt: snapshot.asOf,
    valueClass: 'NOMNI_MODELED_CREDIT',
    status: 'MODELED',
    amount: snapshot.cumulativeNomni,
    unit: 'NOMNI',
    creditAccountId,
    provenanceRecordIds,
    memo: 'World Credit Clock modeled cumulative NOMNI'
  }
}
