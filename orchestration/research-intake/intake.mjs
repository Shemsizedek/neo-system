import { createHash } from 'node:crypto';

const roles = ['extraction', 'prompt', 'report'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 512;

// Only a trusted connector adapter may supply identity/version. Content is inert bytes.
export function fingerprint(source, version, parts) {
  if (!validId(source) || !validId(version) || !Array.isArray(parts) || parts.length !== roles.length) throw new TypeError('invalid package');
  const entries = roles.map(role => {
    const matches = parts.filter(p => p?.role === role);
    if (matches.length !== 1 || !Buffer.isBuffer(matches[0].bytes) || matches[0].bytes.length === 0 || matches[0].bytes.length > 4 * 1024 * 1024) throw new TypeError('invalid part');
    return [role, digest(matches[0].bytes)];
  });
  return { source, version, entries, hash: digest(JSON.stringify(entries)) };
}

// History is supplied by the trusted private register; never by a research package.
export function classify(record, history) {
  if (history.some(r => r.source === record.source && r.version === record.version && r.hash !== record.hash)) return 'CONFLICT';
  if (history.some(r => r.hash === record.hash)) return 'DUPLICATE';
  return 'REVIEW';
}
