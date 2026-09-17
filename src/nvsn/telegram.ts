import { prototypeSignature, signTelegram } from './crypto';
import type { NvsnTelegram, TelegramPriority, TelegramType } from './types';

function uid(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand[0].toString(36)}${rand[1].toString(36)}`.toUpperCase();
}

function nonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createTelegram<T>(input: {
  source: string;
  destination: string;
  type: TelegramType;
  payload: T;
  ttlSeconds?: number;
  priority?: TelegramPriority;
}): NvsnTelegram<T> {
  const now = new Date();
  const unsigned: NvsnTelegram<T> = {
    id: uid('NVT'), version: 'NVSN/1.1', source: input.source, destination: input.destination,
    type: input.type, priority: input.priority ?? 'normal', createdAt: now.toISOString(),
    expiresAt: input.ttlSeconds ? new Date(now.getTime() + input.ttlSeconds * 1000).toISOString() : undefined,
    payload: input.payload, security: { nonce: nonce(), algorithm: 'demo-fnv1a' },
  };
  return { ...unsigned, signature: prototypeSignature(unsigned) };
}

export async function createSignedTelegram<T>(input: {
  source: string; destination: string; type: TelegramType; payload: T; privateKey: CryptoKey;
  keyId?: string; ttlSeconds?: number; priority?: TelegramPriority;
}): Promise<NvsnTelegram<T>> {
  const telegram = createTelegram(input);
  telegram.security = { ...telegram.security, algorithm: 'Ed25519', keyId: input.keyId };
  telegram.signature = await signTelegram(telegram, input.privateKey);
  return telegram;
}

export function isExpired(telegram: NvsnTelegram, now = new Date()): boolean {
  return telegram.expiresAt ? Date.parse(telegram.expiresAt) <= now.getTime() : false;
}
