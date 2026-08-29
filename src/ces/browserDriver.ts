export type BrowserElement = { selector: string }

export interface CesBrowserDriver {
  open(url: string): Promise<void>
  fill(selector: string, value: string): Promise<void>
  click(selector: string): Promise<void>
  waitFor(selector: string, timeoutMs?: number): Promise<void>
  currentUrl(): Promise<string>
  text(selector: string): Promise<string>
  texts(selector: string): Promise<string[]>
  exists(selector: string): Promise<boolean>
  close(): Promise<void>
}

export type CesLegacySelectors = {
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

export const conservativeLegacySelectors: CesLegacySelectors = {
  username: 'input[type="text"], input[name*="account" i], input[name*="email" i]',
  password: 'input[type="password"]',
  submit: 'button[type="submit"], input[type="submit"]',
  loggedInMarker: 'a[href*="logout" i], button[name*="logout" i], [data-authenticated="true"]',
  sessionExpiredMarker: 'input[type="password"]'
}
