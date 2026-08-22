import type { Rail, RailQuote } from './types';

const CES_PACKET_ENDPOINT = import.meta.env.VITE_CES_MARKET_PACKET_ENDPOINT || '';
const MAX_AGE_MS = Number(import.meta.env.VITE_CES_QUOTE_MAX_AGE_MS || 300000);

type CesMarketQuote = {
  asset?: string;
  quoteCurrency?: string;
  unitPrice?: number;
  sampleSize?: number;
  observedAt?: string;
  methodology?: string;
};

type NomniMarketPacket = {
  exchangeId?: string;
  quotes?: CesMarketQuote[];
  generatedAt?: string;
};

export async function quoteFromCesPacket(
  rail: Extract<Rail, 'XCP' | 'NOMNI'>,
  displayUsd: number,
): Promise<RailQuote | null> {
  if (!CES_PACKET_ENDPOINT) return null;

  const url = new URL(CES_PACKET_ENDPOINT);
  url.searchParams.set('asset', rail);
  const response = await fetch(url.toString(), { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`CES market packet unavailable (${response.status})`);

  const packet = await response.json() as NomniMarketPacket;
  const quote = packet.quotes?.find((item) =>
    item.asset?.toUpperCase() === rail && item.quoteCurrency?.toUpperCase() === 'USD'
  );
  if (!quote || !quote.unitPrice || quote.unitPrice <= 0) return null;

  const observedAt = quote.observedAt || packet.generatedAt;
  const observedMs = observedAt ? Date.parse(observedAt) : NaN;
  if (!Number.isFinite(observedMs)) throw new Error(`CES ${rail} quote missing observation timestamp`);
  if (Date.now() - observedMs > MAX_AGE_MS) throw new Error(`CES ${rail} quote is stale`);

  const now = Date.now();
  return {
    rail,
    asset: rail,
    unitAmount: displayUsd / quote.unitPrice,
    source: `CES/NEO market packet ${packet.exchangeId || 'unknown'} · ${quote.sampleSize || 1} sample(s)`,
    quotedAt: new Date(now).toISOString(),
    expiresAt: new Date(Math.min(observedMs + MAX_AGE_MS, now + 60_000)).toISOString(),
  };
}
