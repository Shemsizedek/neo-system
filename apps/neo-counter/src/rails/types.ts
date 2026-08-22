export type Rail = 'BTC' | 'XCP' | 'NOMNI' | 'USD';

export type RailQuote = {
  rail: Rail;
  asset: string;
  unitAmount: number;
  source: string;
  quotedAt: string;
  expiresAt: string;
};

export type PaymentObservation = {
  detected: boolean;
  confirmed: boolean;
  reference?: string;
  amount?: number;
  source: string;
};

export interface ReadOnlyRail {
  quote(displayUsd: number): Promise<RailQuote>;
  observe(input: {
    address: string;
    expectedAmount: number;
    startedAt: string;
  }): Promise<PaymentObservation>;
}
