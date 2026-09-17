import type { NvsnTelegram, SettlementInstruction } from './types';
import { createTelegram } from './telegram';

export interface NeoWireRequest {
  source: string;
  destination: string;
  instruction: SettlementInstruction;
  memo?: string;
}

export function createNeoWireTelegram(request: NeoWireRequest): NvsnTelegram<NeoWireRequest> {
  return createTelegram({
    source: request.source,
    destination: request.destination,
    type: 'payment',
    payload: request,
    ttlSeconds: 900,
  });
}

export function isNeoWireTelegram(telegram: NvsnTelegram): boolean {
  return telegram.type === 'payment' && typeof telegram.payload === 'object' && telegram.payload !== null && 'instruction' in telegram.payload;
}
