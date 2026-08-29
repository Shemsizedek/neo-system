import type { CesLegacySelectors } from './browserDriver'

declare const process: { env: Record<string, string | undefined> }

export type CesSelectorEnvKeys = {
  username: string
  password: string
  submit: string
  loggedInMarker: string
  sessionExpiredMarker?: string
  offersRows?: string
  wantsRows?: string
  balancesRows?: string
  activityRows?: string
  transactionsRows?: string
}

export const nmniSelectorEnvKeys: CesSelectorEnvKeys = {
  username: 'CES_NMNI_SELECTOR_USERNAME',
  password: 'CES_NMNI_SELECTOR_PASSWORD',
  submit: 'CES_NMNI_SELECTOR_SUBMIT',
  loggedInMarker: 'CES_NMNI_SELECTOR_AUTHENTICATED',
  sessionExpiredMarker: 'CES_NMNI_SELECTOR_SESSION_EXPIRED',
  offersRows: 'CES_NMNI_SELECTOR_OFFERS_ROWS',
  wantsRows: 'CES_NMNI_SELECTOR_WANTS_ROWS',
  balancesRows: 'CES_NMNI_SELECTOR_BALANCES_ROWS',
  activityRows: 'CES_NMNI_SELECTOR_ACTIVITY_ROWS',
  transactionsRows: 'CES_NMNI_SELECTOR_TRANSACTIONS_ROWS'
}

export function selectorsFromEnv(keys: CesSelectorEnvKeys = nmniSelectorEnvKeys): CesLegacySelectors | undefined {
  const username = process.env[keys.username]
  const password = process.env[keys.password]
  const submit = process.env[keys.submit]
  const loggedInMarker = process.env[keys.loggedInMarker]

  if (!username || !password || !submit || !loggedInMarker) return undefined

  const optional = (key?: string) => key ? process.env[key] : undefined
  return {
    username,
    password,
    submit,
    loggedInMarker,
    sessionExpiredMarker: optional(keys.sessionExpiredMarker),
    offersRows: optional(keys.offersRows),
    wantsRows: optional(keys.wantsRows),
    balancesRows: optional(keys.balancesRows),
    activityRows: optional(keys.activityRows),
    transactionsRows: optional(keys.transactionsRows)
  }
}
