import { DurableObject } from 'cloudflare:workers'
import puppeteer, { type Browser, type Page } from '@cloudflare/puppeteer'

interface Env {
  BROWSER: Fetcher
  CES_BROWSER_SESSIONS: DurableObjectNamespace<CesBrowserSession>
  CES_BROWSER_GATEWAY_TOKEN: string
  CES_BROWSER_ALLOWED_ORIGINS: string
  CES_BROWSER_SESSION_TTL_SECONDS?: string
}

type BrowserOperation =
  | { op: 'open'; url: string }
  | { op: 'fill'; selector: string; value: string }
  | { op: 'click'; selector: string }
  | { op: 'waitFor'; selector: string; timeoutMs?: number }
  | { op: 'currentUrl' }
  | { op: 'text'; selector: string }
  | { op: 'texts'; selector: string }
  | { op: 'exists'; selector: string }
  | { op: 'close' }

type GatewayRequest = {
  sessionId?: string
  operation?: BrowserOperation
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const MAX_BODY_BYTES = 32_768
const MAX_SELECTOR_LENGTH = 2_000
const MAX_FILL_VALUE_LENGTH = 16_384
const MAX_TEXT_ROWS = 1_000
const MAX_TEXT_LENGTH = 16_384
const CLICK_NAVIGATION_GRACE_MS = 2_000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function allowedOrigins(raw: string) {
  const origins = raw.split(',').map((value) => value.trim()).filter(Boolean).map((value) => {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') throw new Error('CES browser allowed origins must use HTTPS')
    return parsed.origin
  })
  if (origins.length === 0) throw new Error('At least one CES browser origin must be configured')
  return new Set(origins)
}

function safeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left)
  const b = new TextEncoder().encode(right)
  const length = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

function validSelector(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_SELECTOR_LENGTH
}

function parseOperation(value: unknown): BrowserOperation | undefined {
  if (!value || typeof value !== 'object') return undefined
  const op = (value as { op?: unknown }).op
  if (op === 'currentUrl' || op === 'close') return { op }
  if (op === 'open') {
    const url = (value as { url?: unknown }).url
    return typeof url === 'string' ? { op, url } : undefined
  }
  if (op === 'fill') {
    const selector = (value as { selector?: unknown }).selector
    const fillValue = (value as { value?: unknown }).value
    if (!validSelector(selector) || typeof fillValue !== 'string' || fillValue.length > MAX_FILL_VALUE_LENGTH) return undefined
    return { op, selector: selector.trim(), value: fillValue }
  }
  if (op === 'click' || op === 'text' || op === 'texts' || op === 'exists') {
    const selector = (value as { selector?: unknown }).selector
    return validSelector(selector) ? { op, selector: selector.trim() } as BrowserOperation : undefined
  }
  if (op === 'waitFor') {
    const selector = (value as { selector?: unknown }).selector
    const timeoutMs = (value as { timeoutMs?: unknown }).timeoutMs
    if (!validSelector(selector)) return undefined
    if (timeoutMs !== undefined && (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs))) return undefined
    return { op, selector: selector.trim(), timeoutMs: timeoutMs === undefined ? undefined : Math.min(Math.max(timeoutMs, 1), 30_000) }
  }
  return undefined
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/v1/ces/browser') return json({ ok: false, error: 'Not found' }, 404)
    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

    const expected = env.CES_BROWSER_GATEWAY_TOKEN
    const presented = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!expected || !safeEqual(presented, expected)) return json({ ok: false, error: 'Unauthorized' }, 401)

    const declaredLength = Number(request.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_BODY_BYTES) return json({ ok: false, error: 'Request too large' }, 413)

    let body: GatewayRequest
    try {
      const text = await request.text()
      if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json({ ok: false, error: 'Request too large' }, 413)
      body = JSON.parse(text) as GatewayRequest
    } catch {
      return json({ ok: false, error: 'Invalid JSON' }, 400)
    }

    const operation = parseOperation(body.operation)
    if (!operation) return json({ ok: false, error: 'Invalid browser operation' }, 400)

    const sessionId = body.sessionId?.trim() || crypto.randomUUID()
    if (!/^[A-Za-z0-9-]{8,128}$/.test(sessionId)) return json({ ok: false, error: 'Invalid session ID' }, 400)

    const stub = env.CES_BROWSER_SESSIONS.getByName(sessionId)
    const forwarded = new Request('https://ces-session.internal/command', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ sessionId, operation })
    })
    return stub.fetch(forwarded)
  }
} satisfies ExportedHandler<Env>

export class CesBrowserSession extends DurableObject<Env> {
  private browser?: Browser
  private page?: Page
  private readonly origins: Set<string>
  private readonly ttlMs: number

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.origins = allowedOrigins(env.CES_BROWSER_ALLOWED_ORIGINS)
    const parsedTtl = Number(env.CES_BROWSER_SESSION_TTL_SECONDS ?? '300')
    this.ttlMs = Math.min(Math.max(Number.isFinite(parsedTtl) ? parsedTtl : 300, 30), 900) * 1000
  }

  async fetch(request: Request): Promise<Response> {
    let body: { sessionId: string; operation: BrowserOperation }
    try {
      body = await request.json() as { sessionId: string; operation: BrowserOperation }
    } catch {
      return json({ ok: false, error: 'Invalid session payload' }, 400)
    }

    try {
      if (body.operation.op === 'close') {
        await this.shutdown()
        await this.ctx.storage.deleteAlarm()
        return json({ ok: true, sessionId: body.sessionId, value: null })
      }

      await this.ensurePage()
      const value = await this.execute(body.operation)
      await this.assertCurrentOrigin()
      await this.ctx.storage.setAlarm(Date.now() + this.ttlMs)
      return json({ ok: true, sessionId: body.sessionId, value })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Browser command failed'
      await this.shutdown().catch(() => undefined)
      await this.ctx.storage.deleteAlarm().catch(() => undefined)
      return json({ ok: false, sessionId: body.sessionId, error: message }, 400)
    }
  }

  async alarm(): Promise<void> {
    await this.shutdown()
  }

  private async ensurePage() {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await puppeteer.launch(this.env.BROWSER)
      this.page = undefined
    }
    if (!this.page || this.page.isClosed()) this.page = await this.browser.newPage()
  }

  private async execute(operation: BrowserOperation): Promise<unknown> {
    if (!this.page) throw new Error('Browser page unavailable')

    switch (operation.op) {
      case 'open': {
        const target = new URL(operation.url)
        if (target.protocol !== 'https:' || !this.origins.has(target.origin)) {
          throw new Error(`Navigation blocked for origin: ${target.origin}`)
        }
        await this.page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 })
        return null
      }
      case 'fill':
        await this.page.$eval(operation.selector, (element: any) => { if ('value' in element) element.value = '' })
        await this.page.type(operation.selector, operation.value)
        return null
      case 'click': {
        const navigation = this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: CLICK_NAVIGATION_GRACE_MS }).catch(() => null)
        await this.page.click(operation.selector)
        await navigation
        return null
      }
      case 'waitFor':
        await this.page.waitForSelector(operation.selector, { timeout: operation.timeoutMs ?? 15_000 })
        return null
      case 'currentUrl':
        return this.page.url()
      case 'text':
        return this.page.$eval(operation.selector, (element: any) => String(element.textContent ?? '').trim().slice(0, MAX_TEXT_LENGTH))
      case 'texts':
        return this.page.$$eval(operation.selector, (elements: any[]) => elements.slice(0, MAX_TEXT_ROWS).map((element) => String(element.textContent ?? '').trim().slice(0, MAX_TEXT_LENGTH)))
      case 'exists':
        return Boolean(await this.page.$(operation.selector))
      default:
        throw new Error('Unsupported browser operation')
    }
  }

  private async assertCurrentOrigin() {
    if (!this.page) throw new Error('Browser page unavailable')
    const current = this.page.url()
    if (current === 'about:blank') return
    const parsed = new URL(current)
    if (parsed.protocol !== 'https:' || !this.origins.has(parsed.origin)) {
      throw new Error(`Browser left allowed CES origin: ${parsed.origin}`)
    }
  }

  private async shutdown() {
    try {
      if (this.browser?.isConnected()) await this.browser.close()
    } finally {
      this.page = undefined
      this.browser = undefined
    }
  }
}
