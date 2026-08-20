import { prototypeSignature } from './crypto';
import type { NvsnTelegram, TelegramType } from './types';

function uid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export function createTelegram<T>(input: {
  source: string;
  destination: string;
  type: TelegramType;
  payload: T;
  ttlSeconds?: number;
}): NvsnTelegram<T> {
  const now = new Date();
  const unsigned: NvsnTelegram<T> = {
    id: uid('NVT'),
    version: 'NVSN/1.0',
    source: input.source,
    destination: input.destination,
    type: input.type,
    createdAt: now.toISOString(),
    expiresAt: input.ttlSeconds ? new Date(now.getTime() + input.ttlSeconds * 1000).toISOString() : undefined,
    payload: input.payload,
  };
  return { ...unsigned, signature: prototypeSignature(unsigned) };
}

export function isExpired(telegram: NvsnTelegram, now = new Date()): boolean {
  return telegram.expiresAt ? Date.parse(telegram.expiresAt) <= now.getTime() : false;
}