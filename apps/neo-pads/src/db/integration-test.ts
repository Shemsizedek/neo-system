import assert from "node:assert/strict";
import { PostgresRepository } from "../postgres-repository.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for the Postgres integration test");

const repository = new PostgresRepository(url);
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const propertyId = `TEST-PROP-${suffix}`;
const bookingA = `TEST-BOOK-A-${suffix}`;
const bookingB = `TEST-BOOK-B-${suffix}`;

try {
  assert.equal(await repository.ping(), true);

  await repository.markWalletVerified("1TestWallet", `challenge-${suffix}`);
  assert.equal(await repository.isWalletVerified("1TestWallet"), true);

  await repository.saveProperty({
    id: propertyId,
    hostWallet: "1TestWallet",
    title: "Integration Test Pad",
    location: "Houston",
    priceWorld: 500,
    propertyAuthorityVerified: true,
    status: "ACTIVE"
  });

  await repository.saveBooking({
    id: bookingA,
    propertyId,
    memberNeopassId: `NP-${suffix}`,
    startsAt: "2030-01-01T15:00:00.000Z",
    endsAt: "2030-01-03T11:00:00.000Z",
    amountWorld: 1000,
    state: "PAYMENT_PENDING",
    entitlement: "PENDING"
  });

  let conflict = false;
  try {
    await repository.saveBooking({
      id: bookingB,
      propertyId,
      memberNeopassId: `NP2-${suffix}`,
      startsAt: "2030-01-02T15:00:00.000Z",
      endsAt: "2030-01-04T11:00:00.000Z",
      amountWorld: 1000,
      state: "PAYMENT_PENDING",
      entitlement: "PENDING"
    });
  } catch (error: any) {
    conflict = error?.code === "23P01";
  }
  assert.equal(conflict, true, "overlapping booking must be rejected by Postgres");

  const payload = Buffer.from(JSON.stringify({ eventId: `evt-${suffix}`, bookingId: bookingA, status: "SETTLED" }));
  const first = await repository.applyPaymentEvent({
    eventId: `evt-${suffix}`,
    bookingId: bookingA,
    status: "SETTLED",
    rawPayload: payload
  });
  assert.equal(first.duplicate, false);
  assert.equal(first.booking?.state, "CONFIRMED");
  assert.equal(first.booking?.entitlement, "ACTIVE");

  const duplicate = await repository.applyPaymentEvent({
    eventId: `evt-${suffix}`,
    bookingId: bookingA,
    status: "SETTLED",
    rawPayload: payload
  });
  assert.equal(duplicate.duplicate, true);

  const reconciliation = await repository.getReconciliationSummary();
  assert.equal(reconciliation.supported, true);
  console.log("NEO Pads Postgres integration test passed", { propertyId, bookingA });
} finally {
  await repository.close();
}
