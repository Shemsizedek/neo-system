import type { CesBrowserDriver } from './browserDriver'

export type RemoteBrowserDriverOptions = {
  gatewayUrl: string
  bearerToken: string
  allowedOrigins: string[]
  requestTimeoutMs?: number
}

type RemoteDriverOperation =
  | { op: 'open'; url: string }
  | { op: 'fill'; selector: string; value: string }
  | { op: 'click'; selector: string }
  | { op: 'waitFor'; selector: string; timeoutMs?: number }
  | { op: 'currentUrl' }
  | { op: 'text'; selector: string }
  | { op: 'texts'; selector: string }
  | { op: 'exists'; selector: string }
  | { op: 'close' }

type RemoteDriverResponse = {
  ok: boolean
  sessionId?: string
  value?: unknown
  error?: string
}

export class RemoteCesBrowserDriver implements CesBrowserDriver {
  private sessionId?: string
  private closed = false
  private readonly timeoutMs: number
  private readonly allowedOrigins: Set<string>
  private readonly gatewayUrl: URL

  constructor(private readonly options: RemoteBrowserDriverOptions) {
    const gatewayUrl = new URL(options.gatewayUrl)
    if (gatewayUrl.protocol !== 'https:') {
      throw new Error('CES remote browser gateway must use HTTPS')
    }
    if (!options.bearerToken) throw new Error('CES remote browser gateway token is required')
    if (options.allowedOrigins.length === 0) throw new Error('At least one CES browser origin must be allowed')

    const allowedOrigins = options.allowedOrigins.map((origin) => {
      const parsed = new URL(origin)
      if (parsed.protocol !== 'https:') {
        throw new Error(`CES browser allowed origin must use HTTPS: ${parsed.origin}`)
      }
      return parsed.origin
    })

    this.gatewayUrl = gatewayUrl
    this.timeoutMs = options.requestTimeoutMs ?? 20_000
    this.allowedOrigins = new Set(allowedOrigins)
  }

  async open(url: string): Promise<void> {
    this.assertOpen()
    const target = new URL(url)
    if (target.protocol !== 'https:') {
      throw new Error(`CES remote browser navigation requires HTTPS: ${target.origin}`)
    }
    if (!this.allowedOrigins.has(target.origin)) {
      throw new Error(`CES remote browser navigation blocked for origin: ${target.origin}`)
    }
    await this.command({ op: 'open', url: target.toString() })
  }

  async fill(selector: string, value: string): Promise<void> {
    this.assertOpen()
    await this.command({ op: 'fill', selector: this.requireSelector(selector), value })
  }

  async click(selector: string): Promise<void> {
    this.assertOpen()
    await this.command({ op: 'click', selector: this.requireSelector(selector) })
  }

  async waitFor(selector: string, timeoutMs?: number): Promise<void> {
    this.assertOpen()
    await this.command({ op: 'waitFor', selector: this.requireSelector(selector), timeoutMs })
  }

  async currentUrl(): Promise<string> {
    this.assertOpen()
    const value = await this.command({ op: 'currentUrl' })
    if (typeof value !== 'string') throw new Error('CES remote browser returned an invalid URL')
    return value
  }

  async text(selector: string): Promise<string> {
    this.assertOpen()
    const value = await this.command({ op: 'text', selector: this.requireSelector(selector) })
    if (typeof value !== 'string') throw new Error('CES remote browser returned invalid text')
    return value
  }

  async texts(selector: string): Promise<string[]> {
    this.assertOpen()
    const value = await this.command({ op: 'texts', selector: this.requireSelector(selector) })
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new Error('CES remote browser returned invalid text rows')
    }
    return value
  }

  async exists(selector: string): Promise<boolean> {
    this.assertOpen()
    const value = await this.command({ op: 'exists', selector: this.requireSelector(selector) })
    if (typeof value !== 'boolean') throw new Error('CES remote browser returned an invalid existence result')
    return value
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    if (!this.sessionId) return
    try {
      await this.request({ op: 'close' }, this.sessionId)
    } finally {
      this.sessionId = undefined
    }
  }

  private async command(operation: RemoteDriverOperation): Promise<unknown> {
    const response = await this.request(operation, this.sessionId)
    if (!this.sessionId && response.sessionId) this.sessionId = response.sessionId
    return response.value
  }

  private async request(operation: RemoteDriverOperation, sessionId?: string): Promise<RemoteDriverResponse> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(new URL('/v1/ces/browser', this.gatewayUrl), {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.options.bearerToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ sessionId, operation }),
        signal: controller.signal,
        cache: 'no-store'
      })

      if (!response.ok) throw new Error(`CES remote browser gateway failed with HTTP ${response.status}`)
      const payload = await response.json() as RemoteDriverResponse
      if (!payload.ok) throw new Error(payload.error || 'CES remote browser command failed')
      if (!sessionId && operation.op !== 'close' && !payload.sessionId) {
        throw new Error('CES remote browser gateway did not establish a session')
      }
      return payload
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('CES remote browser gateway request timed out')
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  private requireSelector(selector: string) {
    const trimmed = selector.trim()
    if (!trimmed) throw new Error('CES browser selector cannot be empty')
    if (trimmed.length > 2_000) throw new Error('CES browser selector is too long')
    return trimmed
  }

  private assertOpen() {
    if (this.closed) throw new Error('CES remote browser driver is closed')
  }
}
