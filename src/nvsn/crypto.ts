function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(obj[key])}`).join(',')}}`;
}

export function canonicalTelegramPayload(telegram: object): string {
  return canonicalize(telegram);
}

// Prototype hash: deterministic integrity fingerprint only, not a cryptographic signature.
export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function prototypeSignature(telegram: object): string {
  return `demo-fnv1a:${fnv1a32(canonicalTelegramPayload(telegram))}`;
}