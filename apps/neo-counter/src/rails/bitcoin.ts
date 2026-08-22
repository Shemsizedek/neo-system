import type { PaymentObservation, RailQuote, ReadOnlyRail } from './types';

const BLOCKSTREAM_API = import.meta.env.VITE_BLOCKSTREAM_API || 'https://blockstream.info/api';

export class BitcoinReadOnlyRail implements ReadOnlyRail {
  async quote(displayUsd: number): Promise<RailQuote> {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!response.ok) throw new Error('BTC quote unavailable');
    const data = await response.json() as { bitcoin?: { usd?: number } };
    const usd = data.bitcoin?.usd;
    if (!usd || usd <= 0) throw new Error('BTC quote invalid');
    const now = Date.now();
    return {
      rail: 'BTC',
      asset: 'BTC',
      unitAmount: displayUsd / usd,
      source: 'CoinGecko BTC/USD',
      quotedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 60_000).toISOString(),
    };
  }

  async observe(input: { address: string; expectedAmount: number; startedAt: string }): Promise<PaymentObservation> {
    const response = await fetch(`${BLOCKSTREAM_API}/address/${encodeURIComponent(input.address)}/txs`);
    if (!response.ok) throw new Error('Bitcoin address observation unavailable');
    const txs = await response.json() as Array<any>;
    const started = Date.parse(input.startedAt) / 1000;
    const expectedSats = Math.max(1, Math.floor(input.expectedAmount * 100_000_000));

    for (const tx of txs) {
      const blockTime = tx?.status?.block_time ?? Number.MAX_SAFE_INTEGER;
      if (tx?.status?.confirmed && blockTime < started) continue;
      const received = (tx?.vout ?? [])
        .filter((v: any) => v?.scriptpubkey_address === input.address)
        .reduce((sum: number, v: any) => sum + Number(v?.value ?? 0), 0);
      if (received >= expectedSats) {
        return {
          detected: true,
          confirmed: Boolean(tx?.status?.confirmed),
          reference: tx?.txid,
          amount: received / 100_000_000,
          source: 'Blockstream Esplora',
        };
      }
    }

    return { detected: false, confirmed: false, source: 'Blockstream Esplora' };
  }
}
