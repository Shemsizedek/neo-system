import type {
  NeoCipherDecryptOptions,
  NeoCipherEncryptOptions,
  NeoCipherEnvelope
} from './types'
import {
  base64UrlToBytes,
  bytesToBase64Url,
  fromUtf8,
  randomBytes,
  utf8
} from './encoding'

const DEFAULT_ITERATIONS = 310_000
const DOMAIN = 'NEO-CIPHER:#D:999:144:v1'

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  if (passphrase.length < 12) {
    throw new Error('Passphrase must be at least 12 characters.')
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    utf8(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function aadFor(envelope: Pick<NeoCipherEnvelope, 'version' | 'protocol' | 'symbolicConstants' | 'algorithm' | 'kdf' | 'iterations' | 'createdAt'>): Uint8Array {
  return utf8(JSON.stringify({ domain: DOMAIN, ...envelope }))
}

export async function encryptNeoCipher(
  plaintext: string,
  options: NeoCipherEncryptOptions
): Promise<NeoCipherEnvelope> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS
  if (!Number.isInteger(iterations) || iterations < 100_000) {
    throw new Error('PBKDF2 iterations must be an integer of at least 100000.')
  }

  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const createdAt = new Date().toISOString()
  const header = {
    version: 'NEO-CIPHER-1' as const,
    protocol: '#D' as const,
    symbolicConstants: { cycle: 999 as const, resonance: 144 as const },
    algorithm: 'AES-GCM-256' as const,
    kdf: 'PBKDF2-SHA-256' as const,
    iterations,
    createdAt
  }
  const key = await deriveKey(options.passphrase, salt, iterations)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aadFor(header), tagLength: 128 },
    key,
    utf8(plaintext)
  )

  return {
    ...header,
    salt: bytesToBase64Url(salt),
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(encrypted))
  }
}

export async function decryptNeoCipher(
  envelope: NeoCipherEnvelope,
  options: NeoCipherDecryptOptions
): Promise<string> {
  if (envelope.version !== 'NEO-CIPHER-1' || envelope.protocol !== '#D') {
    throw new Error('Unsupported NEO Cipher envelope.')
  }

  const salt = base64UrlToBytes(envelope.salt)
  const iv = base64UrlToBytes(envelope.iv)
  const key = await deriveKey(options.passphrase, salt, envelope.iterations)
  const header = {
    version: envelope.version,
    protocol: envelope.protocol,
    symbolicConstants: envelope.symbolicConstants,
    algorithm: envelope.algorithm,
    kdf: envelope.kdf,
    iterations: envelope.iterations,
    createdAt: envelope.createdAt
  }
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aadFor(header), tagLength: 128 },
    key,
    base64UrlToBytes(envelope.ciphertext)
  )

  return fromUtf8(decrypted)
}
