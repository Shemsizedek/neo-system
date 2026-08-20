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
  toArrayBuffer,
  utf8
} from './encoding'

const DEFAULT_ITERATIONS = 310_000
const MIN_ITERATIONS = 100_000
const MAX_ITERATIONS = 2_000_000
const DOMAIN = 'NEO-CIPHER:#D:999:144:v1'

function assertIterationCount(iterations: number): void {
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new Error(`PBKDF2 iterations must be an integer between ${MIN_ITERATIONS} and ${MAX_ITERATIONS}.`)
  }
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  if (passphrase.length < 12) {
    throw new Error('Passphrase must be at least 12 characters.')
  }
  assertIterationCount(iterations)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(utf8(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
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

function validateEnvelopeHeader(envelope: NeoCipherEnvelope): void {
  if (
    envelope.version !== 'NEO-CIPHER-1' ||
    envelope.protocol !== '#D' ||
    envelope.algorithm !== 'AES-GCM-256' ||
    envelope.kdf !== 'PBKDF2-SHA-256' ||
    envelope.symbolicConstants?.cycle !== 999 ||
    envelope.symbolicConstants?.resonance !== 144
  ) {
    throw new Error('Unsupported or invalid NEO Cipher envelope.')
  }
  assertIterationCount(envelope.iterations)
}

export async function encryptNeoCipher(
  plaintext: string,
  options: NeoCipherEncryptOptions
): Promise<NeoCipherEnvelope> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS
  assertIterationCount(iterations)

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
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(aadFor(header)),
      tagLength: 128
    },
    key,
    toArrayBuffer(utf8(plaintext))
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
  validateEnvelopeHeader(envelope)

  const salt = base64UrlToBytes(envelope.salt)
  const iv = base64UrlToBytes(envelope.iv)
  const ciphertext = base64UrlToBytes(envelope.ciphertext)

  if (salt.length !== 16) throw new Error('Invalid NEO Cipher salt length.')
  if (iv.length !== 12) throw new Error('Invalid NEO Cipher IV length.')
  if (ciphertext.length < 16) throw new Error('Invalid NEO Cipher ciphertext.')

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
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(aadFor(header)),
      tagLength: 128
    },
    key,
    toArrayBuffer(ciphertext)
  )

  return fromUtf8(decrypted)
}
