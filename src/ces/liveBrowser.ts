import type { CesCredentials } from './auth'
import type { CesExchange, CesRecordKind } from './types'
import type { CesCoordinatorBrowser, CesRawRecord, CesSession } from './session'
import type { CesBrowserDriver, CesLegacySelectors } from './browserDriver'
import { conservativeLegacySelectors } from './browserDriver'

export type CesLiveBrowserOptions = {
  loginUrl?: string
  selectors?: CesLegacySelectors
  loginTimeoutMs?: number
  maxRetries?: number
}

export class LiveLegacyCesCoordinatorBrowser implements CesCoordinatorBrowser {
  private readonly loginUrl: string
  private readonly selectors: CesLegacySelectors
  private readonly loginTimeoutMs: number
  private readonly maxRetries: number

  constructor(
    private readonly driverFactory: () => Promise<CesBrowserDriver>,
    options: CesLiveBrowserOptions = {}
  ) {
    this.loginUrl = options.loginUrl ?? 'https://www.community-exchange.org/home/user-login/'
    this.selectors = options.selectors ?? conservativeLegacySelectors
    this.loginTimeoutMs = options.loginTimeoutMs ?? 15_000
    this.maxRetries = options.maxRetries ?? 2
  }

  async login(exchange: CesExchange, credentials: CesCredentials): Promise<CesSession> {
    const driver = await this.driverFactory()
    try {
      await driver.open(this.loginUrl)
      await driver.fill(this.selectors.username, credentials.username)
      await driver.fill(this.selectors.password, credentials.password)
      await driver.click(this.selectors.submit)
      await driver.waitFor(this.selectors.loggedInMarker, this.loginTimeoutMs)

      const authenticatedAt = new Date().toISOString()
      const session: CesSession & { driver: CesBrowserDriver } = {
        exchangeId: exchange.xid,
        authenticatedAt,
        driver,
        close: async () => driver.close()
      }
      return session
    } catch (error) {
      await driver.close().catch(() => undefined)
      throw error
    }
  }

  async collect(session: CesSession, exchange: CesExchange, kinds: CesRecordKind[]): Promise<CesRawRecord[]> {
    const driver = (session as CesSession & { driver?: CesBrowserDriver }).driver
    if (!driver) throw new Error('CES browser session is missing its driver')

    if (await this.isExpired(driver)) throw new Error(`CES session expired for ${exchange.xid}`)

    const output: CesRawRecord[] = []
    for (const kind of kinds) {
      output.push(...(await this.collectKindWithRetry(driver, kind)))
    }
    return output
  }

  private async collectKindWithRetry(driver: CesBrowserDriver, kind: CesRecordKind): Promise<CesRawRecord[]> {
    let lastError: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.collectKind(driver, kind)
      } catch (error) {
        lastError = error
        if (await this.isExpired(driver)) throw new Error('CES authenticated session expired during collection')
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Failed to collect ${kind}`)
  }

  private async collectKind(driver: CesBrowserDriver, kind: CesRecordKind): Promise<CesRawRecord[]> {
    const selector = this.selectorFor(kind)
    if (!selector) return []
    if (!(await driver.exists(selector))) return []

    const rows = await driver.texts(selector)
    return rows
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text, index) => ({
        kind,
        payload: {
          rawText: text,
          rowIndex: index,
          extraction: 'legacy-browser-text-v1'
        }
      }))
  }

  private selectorFor(kind: CesRecordKind) {
    switch (kind) {
      case 'OFFER': return this.selectors.offersRows
      case 'WANT': return this.selectors.wantsRows
      case 'BALANCE': return this.selectors.balancesRows
      case 'ACTIVITY': return this.selectors.activityRows
      case 'TRANSACTION': return this.selectors.transactionsRows
      default: return undefined
    }
  }

  private async isExpired(driver: CesBrowserDriver) {
    const marker = this.selectors.sessionExpiredMarker
    if (!marker) return false
    const url = await driver.currentUrl()
    const looksLikeLogin = /login|signin|user-login/i.test(url)
    return looksLikeLogin && await driver.exists(marker)
  }
}
