import { RemoteCesBrowserDriver, type RemoteBrowserDriverOptions } from './remoteBrowserDriver'
import type { CesBrowserDriver } from './browserDriver'

declare const process: { env: Record<string, string | undefined> }

export type RemoteBrowserEnvKeys = {
  gatewayUrl: string
  gatewayToken: string
  allowedOrigins: string
  requestTimeoutMs?: string
}

export const defaultRemoteBrowserEnvKeys: RemoteBrowserEnvKeys = {
  gatewayUrl: 'CES_BROWSER_GATEWAY_URL',
  gatewayToken: 'CES_BROWSER_GATEWAY_TOKEN',
  allowedOrigins: 'CES_BROWSER_ALLOWED_ORIGINS',
  requestTimeoutMs: 'CES_BROWSER_REQUEST_TIMEOUT_MS'
}

export function remoteBrowserOptionsFromEnv(
  keys: RemoteBrowserEnvKeys = defaultRemoteBrowserEnvKeys
): RemoteBrowserDriverOptions | undefined {
  const gatewayUrl = process.env[keys.gatewayUrl]
  const bearerToken = process.env[keys.gatewayToken]
  const rawOrigins = process.env[keys.allowedOrigins]

  if (!gatewayUrl || !bearerToken || !rawOrigins) return undefined

  const allowedOrigins = rawOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const rawTimeout = keys.requestTimeoutMs ? process.env[keys.requestTimeoutMs] : undefined
  const parsedTimeout = rawTimeout ? Number(rawTimeout) : undefined
  const requestTimeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout! > 0
    ? Math.min(parsedTimeout!, 60_000)
    : undefined

  return { gatewayUrl, bearerToken, allowedOrigins, requestTimeoutMs }
}

export function remoteCesBrowserDriverFactory(
  keys: RemoteBrowserEnvKeys = defaultRemoteBrowserEnvKeys
): () => Promise<CesBrowserDriver> {
  return async () => {
    const options = remoteBrowserOptionsFromEnv(keys)
    if (!options) {
      throw new Error('CES remote browser gateway environment is not fully configured')
    }
    return new RemoteCesBrowserDriver(options)
  }
}
