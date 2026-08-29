import type { Rail, ReadOnlyRail } from './types';
import { BitcoinReadOnlyRail } from './bitcoin';
import { CounterpartyReadOnlyRail } from './counterparty';

export function getReadOnlyRail(rail: Rail, asset?: string): ReadOnlyRail {
  if (rail === 'BTC') return new BitcoinReadOnlyRail();
  if (rail === 'XCP' || rail === 'NOMNI') return new CounterpartyReadOnlyRail(asset || rail);
  throw new Error(`No live read-only rail configured for ${rail}`);
}
