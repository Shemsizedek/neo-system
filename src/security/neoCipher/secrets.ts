import { bytesToBase64Url, randomBytes } from './encoding'

export type SecretTokenOptions = {
  bytes?: number
  label?: string
}

export function createSecretToken(options: SecretTokenOptions = {}): string {
  const bytes = options.bytes ?? 32
  if (!Number.isInteger(bytes) || bytes < 16) {
    throw new Error('Secret tokens must contain at least 16 random bytes.')
  }

  const label = (options.label ?? 'NEO').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'NEO'
  return `${label}_D999144_${bytesToBase64Url(randomBytes(bytes))}`
}

export function validatePassphraseCandidate(passphrase: string): { valid: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (passphrase.length < 16) reasons.push('Use at least 16 characters; longer multi-word phrases are preferred.')
  if (/^(.)\1+$/.test(passphrase)) reasons.push('Repeated single-character passphrases are not allowed.')
  if (/password|letmein|qwerty|123456/i.test(passphrase)) reasons.push('Common password patterns are not allowed.')

  return { valid: reasons.length === 0, reasons }
}
