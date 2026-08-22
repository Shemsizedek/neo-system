declare const process: { env: Record<string, string | undefined> }

export type CesCredentialRef = {
  exchangeId: string
  usernameKey: string
  passwordKey: string
  totpKey?: string
}

export type CesCredentials = {
  username: string
  password: string
  totp?: string
}

export interface CesSecretProvider {
  get(ref: CesCredentialRef): Promise<CesCredentials>
}

export class EnvCesSecretProvider implements CesSecretProvider {
  async get(ref: CesCredentialRef): Promise<CesCredentials> {
    const username = process.env[ref.usernameKey]
    const password = process.env[ref.passwordKey]
    const totp = ref.totpKey ? process.env[ref.totpKey] : undefined

    if (!username || !password) {
      throw new Error(`Missing CES coordinator credentials for ${ref.exchangeId}`)
    }

    return { username, password, totp }
  }
}

export function cesCredentialRef(exchangeId: string): CesCredentialRef {
  const prefix = `CES_${exchangeId.toUpperCase()}`
  return {
    exchangeId,
    usernameKey: `${prefix}_USERNAME`,
    passwordKey: `${prefix}_PASSWORD`,
    totpKey: `${prefix}_TOTP`
  }
}
