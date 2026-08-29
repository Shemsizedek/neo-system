import type { CesCredentials } from './auth'
import type { CesExchange, CesRecordKind } from './types'
import type { CesCoordinatorBrowser, CesRawRecord, CesSession } from './session'
import type { CesBrowserDriver, CesLegacySelectors } from './browserDriver'
import { conservativeLegacySelectors } from './browserDriver'
import type { CesCollectionPolicy } from './collectionPolicy'
import { assertKindAllowed, defaultCesCollectionPolicy } from './collectionPolicy'
import { routeForKind } from './routeMap'

export type CesLiveBrowserOptions = {
  loginUrl?: string
  selectors?: CesLegacySelectors
  loginTimeoutMs?: number
  maxRetries?: number
  collectionPolicy?: CesCollectionPolicy
}

export class LiveLegacyCesCoordinatorBrowser implements CesCoordinatorBrowser {
  private readonly loginUrl: string
  private readonly selectors: CesLegacySelectors
  private readonly loginTimeoutMs: number
  private readonly maxRetries: number
  private readonly policy: CesCollectionPolicy

  constructor(
    private readonly driverFactory: () => Promise<CesBrowserDriver>,
    options: CesLiveBrowserOptions = {}
  ) {
    this.loginUrl = options.loginUrl ?? 'https://www.community-exchange.org/home/user-login/'
    this.selectors = options.selectors ?? conservativeLegacySelectors
    this.loginTimeoutMs = options.loginTimeoutMs ?? 15_000
    this.maxRetries = options.maxRetries ?? 2
    this.policy = options.collectionPolicy ?? defaultCesCollectionPolicy
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
    if (this.policy.requireExchangeMatch && session.exchangeId !== exchange.xid) {
      throw new Error(`CES session exchange mismatch: ${session.exchangeId} != ${exchange.xid}`)
    }
    if (await this.isExpired(driver)) throw new Error(`CES session expired for ${exchange.xid}`)

    const output: CesRawRecord[] = []
    for (const kind of kinds) {
      assertKindAllowed(this.policy, kind)
      output.push(...(await this.collectKindWithRetry(driver, exchange, kind)))
    }
    return output
  }

  private async collectKindWithRetry(driver: CesBrowserDriver, exchange: CesExchange, kind: CesRecordKind): Promise<CesRawRecord[]> {
    let lastError: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.collectKind(driver, exchange, kind)
      } catch (error) {
        lastError = error
        if (await this.isExpired(driver)) throw new Error('CES authenticated session expired during collection')
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Failed to collect ${kind}`)
  }

  private async collectKind(driver: CesBrowserDriver, exchange: CesExchange, kind: CesRecordKind): Promise<CesRawRecord[]> {
    const route = routeForKind(kind)
    const selector = this.selectorFor(kind)
    if (!route || !selector) return []
    if (route.dataClass === 'AUTHORIZED' && !this.policy.allowAuthorizedRawText) return []

    await driver.open(new URL(route.urlPattern, exchange.serverUrl).toString())
    if (await this.isExpired(driver)) throw new Error(`CES session expired while opening ${kind}`)
    if (!(await driver.exists(selector))) return []

    const rows = (await driver.texts(selector)).slice(0, this.policy.maxRowsPerKind)
    return rows
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text, index) => ({
        kind,
        payload: {
          rawText: text,
          rowIndex: index,
          extraction: 'legacy-browser-text-v1',
          dataClass: route.dataClass
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
