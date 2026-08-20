const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Copy bytes into an owned ArrayBuffer so Web Crypto receives a concrete
 * ArrayBuffer rather than the broader ArrayBufferLike / SharedArrayBuffer type
 * exposed by newer TypeScript typed-array definitions.
 */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export function utf8(value: string): Uint8Array {
  return encoder.encode(value)
}

export function fromUtf8(value: Uint8Array | ArrayBuffer): string {
  return decoder.decode(value instanceof Uint8Array ? toArrayBuffer(value) : value)
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

export function randomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 1) {
    throw new Error('Random byte length must be a positive integer.')
  }
  return crypto.getRandomValues(new Uint8Array(length))
}
