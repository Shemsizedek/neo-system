import crypto from "node:crypto";
import { PostgresRepository } from "./postgres-repository.js";
import type { BookingRecord, PropertyRecord, ReconciliationSummary, Repository } from "./repository.js";
import { RuntimeStore } from "./store.js";

class LocalRepository implements Repository {
  readonly mode: "memory" | "file";
  private readonly store = new RuntimeStore();

  constructor() {
    this.mode = process.env.NEO_PADS_DATA_FILE ? "file" : "memory";
  }

  async getProperty(id: string) { return this.store.properties[id] as PropertyRecord | undefined; }
  async listActiveProperties(location = "") {
    const needle = location.toLowerCase();
    return Object.values(this.store.properties)
      .map((v) => v as PropertyRecord)
      .filter((p) => p.status === "ACTIVE" && (!needle || p.location.toLowerCase().includes(needle)));
  }
  async saveProperty(value: PropertyRecord) { this.store.setProperty(value.id, value); }
  async getBooking(id: string) { return this.store.bookings[id] as BookingRecord | undefined; }
  async hasSettledPayment(_bookingId: string) { return false; }
  async saveBooking(value: BookingRecord) { this.store.setBooking(value.id, value); }
  async markWalletVerified(wallet: string, challengeId: string) { this.store.markWalletVerified(wallet, challengeId); }
  async isWalletVerified(wallet: string) { return this.store.isWalletVerified(wallet); }
  async hasWebhookEvent(eventId: string) { return this.store.hasWebhookEvent(eventId); }

  async applyPaymentEvent(input: { eventId: string; bookingId: string; status: string; rawPayload: Buffer }) {
    if (this.store.hasWebhookEvent(input.eventId)) return { duplicate: true };
    const booking = this.store.bookings[input.bookingId] as BookingRecord | undefined;
    if (!booking) throw new Error("booking_not_found");
    if (input.status === "SETTLED") { booking.state = "CONFIRMED"; booking.entitlement = "ACTIVE"; }
    else if (input.status === "REFUNDED") { booking.state = "REFUNDED"; booking.entitlement = "REVOKED"; }
    else if (input.status === "DISPUTED") { booking.state = "DISPUTED"; booking.entitlement = "REVOKED"; }
    this.store.setBooking(booking.id, booking);
    crypto.createHash("sha256").update(input.rawPayload).digest("hex");
    this.store.markWebhookEvent(input.eventId);
    return { duplicate: false, booking };
  }

  async ping() { return true; }

  async getReconciliationSummary(): Promise<ReconciliationSummary> {
    return {
      supported: false,
      generatedAt: new Date().toISOString(),
      pendingPayments: 0,
      settledPaymentsWithoutPayout: 0,
      pendingPayouts: 0,
      failedPayouts: 0,
      recentPaymentEvents: 0
    };
  }

  async close() {}
}

export function createRepository(): Repository {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return databaseUrl ? new PostgresRepository(databaseUrl) : new LocalRepository();
}
