import type { PaymentObservation, RailQuote, ReadOnlyRail } from './types';
import { quoteFromCesPacket } from './cesQuote';
import { matchCounterpartyReceive } from './counterpartyEvidence';

const COUNTERPARTY_API = import.meta.env.VITE_COUNTERPARTY_API || 'https://api.counterparty.io:4000/v2';
const QUOTE_ENDPOINT = import.meta.env.VITE_NEO_COUNTER_QUOTE_ENDPOINT || '';

export class CounterpartyReadOnlyRail implements ReadOnlyRail {
  constructor(private readonly asset: string) {}

  async quote(displayUsd: number): Promise<RailQuote> {
    if (this.asset === 'XCP' || this.asset === 'NOMNI') {
      const cesQuote = await quoteFromCesPacket(this.asset, displayUsd);
      if (cesQuote) return cesQuote;
    }

    if (!QUOTE_ENDPOINT) {
      throw new Error(`${this.asset} quote unavailable: no fresh explicit USD quote and fallback endpoint is not configured`);
    }

    const url = new URL(QUOTE_ENDPOINT);
    url.searchParams.set('asset', this.asset);
    url.searchParams.set('display_currency', 'USD');
    url.searchParams.set('display_amount', String(displayUsd));

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`${this.asset} quote unavailable`);
    const data = await response.json() as { unit_amount?: number; source?: string; expires_at?: string };
    if (!data.unit_amount || data.unit_amount <= 0) throw new Error(`${this.asset} quote invalid`);

    const now = Date.now();
    return {
      rail: this.asset === 'NOMNI' ? 'NOMNI' : 'XCP',
      asset: this.asset,
      unitAmount: data.unit_amount,
      source: data.source || 'NEO market quote service',
      quotedAt: new Date(now).toISOString(),
      expiresAt: data.expires_at || new Date(now + 60_000).toISOString(),
    };
  }

  async observe(input: { address: string; expectedAmount: number; startedAt: string }): Promise<PaymentObservation> {
    const endpoint = `${COUNTERPARTY_API}/addresses/${encodeURIComponent(input.address)}/receives/${encodeURIComponent(this.asset)}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`${this.asset} receive observation unavailable`);
    const payload = await response.json() as any;
    const rows = Array.isArray(payload?.result) ? payload.result : Array.isArray(payload) ? payload : [];
    for (const row of rows) {
      const match = matchCounterpartyReceive(row, { ...input, asset: this.asset });
      if (match) {
        return { detected: true, confirmed: true, ...match, source: 'Counterparty API v2' };
      }
    }

    return { detected: false, confirmed: false, source: 'Counterparty API v2' };
  }
}
