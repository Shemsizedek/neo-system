import crypto from 'node:crypto';

const MAX_TIMESTAMP_SKEW_SECONDS = 300;

function discordPublicKeyToKeyObject(publicKeyHex) {
  if (!/^[a-fA-F0-9]{64}$/.test(publicKeyHex ?? '')) {
    throw new Error('invalid-discord-public-key');
  }

  // Discord supplies a raw 32-byte Ed25519 public key. Wrap it in the
  // RFC 8410 SubjectPublicKeyInfo prefix before passing it to Node crypto.
  const raw = Buffer.from(publicKeyHex, 'hex');
  const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
  return crypto.createPublicKey({
    key: Buffer.concat([spkiPrefix, raw]),
    format: 'der',
    type: 'spki'
  });
}

export function verifyDiscordInteraction({
  rawBody,
  signature,
  timestamp,
  publicKeyHex,
  now = Date.now()
}) {
  if (typeof rawBody !== 'string') throw new Error('raw-body-required');
  if (!/^[a-fA-F0-9]{128}$/.test(signature ?? '')) throw new Error('invalid-signature-format');
  if (!/^\d{10,13}$/.test(timestamp ?? '')) throw new Error('invalid-timestamp');

  const epochMs = timestamp.length === 10 ? Number(timestamp) * 1000 : Number(timestamp);
  if (!Number.isFinite(epochMs)) throw new Error('invalid-timestamp');

  const skewSeconds = Math.abs(now - epochMs) / 1000;
  if (skewSeconds > MAX_TIMESTAMP_SKEW_SECONDS) throw new Error('stale-interaction');

  const key = discordPublicKeyToKeyObject(publicKeyHex);
  const message = Buffer.from(`${timestamp}${rawBody}`, 'utf8');
  const signatureBytes = Buffer.from(signature, 'hex');

  if (!crypto.verify(null, message, key, signatureBytes)) {
    throw new Error('invalid-discord-signature');
  }

  return true;
}
