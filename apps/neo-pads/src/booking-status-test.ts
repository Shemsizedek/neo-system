import assert from "node:assert/strict";
import { bookingStatusPayload, canReadBookingStatus } from "./booking-status.js";
import { createRepository } from "./repository-factory.js";
import type { BookingRecord } from "./repository.js";

const booking: BookingRecord = {
  id: "NPB-TEST",
  propertyId: "NP-TEST",
  memberNeopassId: "member-1",
  startsAt: "2030-01-01T00:00:00.000Z",
  endsAt: "2030-01-02T00:00:00.000Z",
  amountWorld: 500,
  state: "CONFIRMED",
  entitlement: "ACTIVE"
};

assert.equal(canReadBookingStatus(booking, { memberId: "member-1", verified: true, accessEligible: true }), true);
assert.equal(canReadBookingStatus(booking, { memberId: "member-2", verified: true, accessEligible: true }), false);
assert.equal(canReadBookingStatus(booking, { memberId: "member-1", verified: false, accessEligible: true }), false);

assert.deepEqual(bookingStatusPayload(booking, false), {
  bookingId: "NPB-TEST",
  bookingState: "PAYMENT_PENDING",
  settlementState: "PENDING",
  entitlementState: "PENDING"
});
assert.deepEqual(bookingStatusPayload(booking, true), {
  bookingId: "NPB-TEST",
  bookingState: "CONFIRMED",
  settlementState: "SETTLED",
  entitlementState: "ACTIVE"
});

const configuredDatabaseUrl = process.env.DATABASE_URL;
delete process.env.DATABASE_URL;
const localRepository = createRepository();
if (configuredDatabaseUrl) process.env.DATABASE_URL = configuredDatabaseUrl;
await localRepository.saveBooking({ ...booking, state: "PAYMENT_PENDING", entitlement: "PENDING" });
const localPayload = Buffer.from(JSON.stringify({
  status: "SETTLED",
  settlementAsset: "BTC",
  networkAmount: 0.001,
  txid: "test-tx"
}));
await localRepository.applyPaymentEvent({
  eventId: "local-event",
  bookingId: booking.id,
  status: "SETTLED",
  rawPayload: localPayload
});
assert.equal(await localRepository.hasSettledPayment(booking.id), true);
await localRepository.close();

console.log("NEO Pads authenticated booking status tests passed");
