function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(obj[key])}`).join(',')}}`;
}

export function canonicalTelegramPayload(telegram: object): string {
  const { signature: _signature, route: _route, ...signable } = telegram as Record<string, unknown>;
  return canonicalize(signable);
}

export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function prototypeSignature(telegram: object): string {
  return `demo-fnv1a:${fnv1a32(canonicalTelegramPayload(telegram))}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function generateNodeSigningKey(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
}

export async function exportPublicSigningKey(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', publicKey);
  return bytesToBase64(new Uint8Array(raw));
}

export async function importPublicSigningKey(encoded: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', exactArrayBuffer(base64ToBytes(encoded)), { name: 'Ed25519' }, true, ['verify']);
}

export async function signTelegram(telegram: object, privateKey: CryptoKey): Promise<string> {
  const data = new TextEncoder().encode(canonicalTelegramPayload(telegram));
  const signature = await crypto.subtle.sign({ name: 'Ed25519' }, privateKey, exactArrayBuffer(data));
  return `ed25519:${bytesToBase64(new Uint8Array(signature))}`;
}

export async function verifyTelegramSignature(telegram: object, publicKey: CryptoKey): Promise<boolean> {
  const signature = (telegram as { signature?: string }).signature;
  if (!signature?.startsWith('ed25519:')) return false;
  const data = new TextEncoder().encode(canonicalTelegramPayload(telegram));
  return crypto.subtle.verify({ name: 'Ed25519' }, publicKey, exactArrayBuffer(base64ToBytes(signature.slice(8))), exactArrayBuffer(data));
}
