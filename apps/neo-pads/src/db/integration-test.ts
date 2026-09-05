import assert from "node:assert/strict";
import pg from "pg";
import { PostgresRepository } from "../postgres-repository.js";

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for the Postgres integration test");

const repository = new PostgresRepository(url);
const inspectionPool = new Pool({ connectionString: url });
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const propertyId = `TEST-PROP-${suffix}`;
const bookingA = `TEST-BOOK-A-${suffix}`;
const bookingB = `TEST-BOOK-B-${suffix}`;
const testWallet = `1TestWallet-${suffix}`;

try {
  assert.equal(await repository.ping(), true);

  await repository.markWalletVerified(testWallet, `challenge-${suffix}`);
  assert.equal(await repository.isWalletVerified(testWallet), true);
  const verification = await inspectionPool.query(
    "SELECT verified_at, expires_at FROM neo_pads_wallet_verifications WHERE wallet=$1",
    [testWallet]
  );
  assert.equal(verification.rowCount, 1);
  assert.ok(verification.rows[0].expires_at, "wallet verification must have an expiry");
  assert.ok(
    new Date(verification.rows[0].expires_at).getTime() > new Date(verification.rows[0].verified_at).getTime(),
    "wallet verification expiry must be after verification time"
  );

  await repository.saveProperty({
    id: propertyId,
    hostWallet: testWallet,
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

  await assert.rejects(
    repository.applyPaymentEvent({
      eventId: `evt-invalid-${suffix}`,
      bookingId: bookingA,
      status: "SETTLED",
      rawPayload: Buffer.from(JSON.stringify({
        eventId: `evt-invalid-${suffix}`,
        bookingId: bookingA,
        status: "SETTLED"
      }))
    }),
    /invalid_settlement_evidence/
  );
  assert.equal((await repository.getBooking(bookingA))?.state, "PAYMENT_PENDING");
  assert.equal(await repository.hasSettledPayment(bookingA), false);

  const payload = Buffer.from(JSON.stringify({
    eventId: `evt-${suffix}`,
    bookingId: bookingA,
    status: "SETTLED",
    paymentId: `pay-${suffix}`,
    settlementAsset: "BTC",
    networkAmount: 0.001,
    txid: `tx-${suffix}`
  }));
  const first = await repository.applyPaymentEvent({
    eventId: `evt-${suffix}`,
    bookingId: bookingA,
    status: "SETTLED",
    rawPayload: payload
  });
  assert.equal(first.duplicate, false);
  assert.equal(first.booking?.state, "CONFIRMED");
  assert.equal(first.booking?.entitlement, "ACTIVE");
  assert.equal(await repository.hasSettledPayment(bookingA), true);

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
  await inspectionPool.end();
  await repository.close();
}
