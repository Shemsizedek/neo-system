export interface PropertyRecord {
  id: string;
  hostWallet: string;
  title: string;
  location: string;
  priceWorld: number;
  propertyAuthorityVerified: boolean;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
}

export type BookingState = "PAYMENT_PENDING" | "CONFIRMED" | "REFUNDED" | "CANCELLED" | "DISPUTED";

export interface BookingRecord {
  id: string;
  propertyId: string;
  memberNeopassId: string;
  startsAt: string;
  endsAt: string;
  amountWorld: number;
  state: BookingState;
  entitlement: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED";
  checkout?: unknown;
}

export interface Repository {
  mode: "memory" | "file" | "postgres";
  getProperty(id: string): Promise<PropertyRecord | undefined>;
  listActiveProperties(location?: string): Promise<PropertyRecord[]>;
  saveProperty(value: PropertyRecord): Promise<void>;
  getBooking(id: string): Promise<BookingRecord | undefined>;
  saveBooking(value: BookingRecord): Promise<void>;
  markWalletVerified(wallet: string, challengeId: string): Promise<void>;
  isWalletVerified(wallet: string): Promise<boolean>;
  hasWebhookEvent(eventId: string): Promise<boolean>;
  applyPaymentEvent(input: {
    eventId: string;
    bookingId: string;
    status: string;
    rawPayload: Buffer;
  }): Promise<{ duplicate: boolean; booking?: BookingRecord }>;
  close(): Promise<void>;
}
