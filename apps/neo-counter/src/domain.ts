export type CurrencyCode = string;
export type AssetCode = string;

export type Money = {
  amount: bigint;
  code: CurrencyCode | AssetCode;
  precision: number;
};

export type PaymentMethod =
  | "btc"
  | "xcp"
  | "counterparty_asset"
  | "card"
  | "fiat"
  | "cash";

export type PaymentStatus =
  | "created"
  | "quoted"
  | "awaiting_payment"
  | "detected"
  | "confirming"
  | "settled"
  | "expired"
  | "cancelled"
  | "failed"
  | "refunded";

export type Quote = {
  id: string;
  displayAmount: Money;
  paymentAmount: Money;
  source: string;
  createdAt: string;
  expiresAt: string;
  estimatedFee?: Money;
};

export type SettlementAllocation = {
  code: CurrencyCode | AssetCode;
  basisPoints: number;
};

export type PaymentIntent = {
  id: string;
  merchantId: string;
  locationId: string;
  orderId: string;
  idempotencyKey: string;
  displayAmount: Money;
  paymentMethod: PaymentMethod;
  paymentAsset?: AssetCode;
  quote?: Quote;
  status: PaymentStatus;
  externalReference?: string;
  settlementPolicy?: SettlementAllocation[];
  createdAt: string;
  updatedAt: string;
};

export type LedgerEntry = {
  id: string;
  paymentIntentId: string;
  merchantId: string;
  account: string;
  direction: "debit" | "credit";
  amount: Money;
  createdAt: string;
};
