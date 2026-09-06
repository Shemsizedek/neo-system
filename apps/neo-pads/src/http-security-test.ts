import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const base = process.env.NEO_PADS_TEST_API_URL ?? "http://127.0.0.1:8788";
const adminToken = process.env.NEO_PADS_ADMIN_TOKEN;
const webhookSecret = process.env.NEO_COUNTER_WEBHOOK_SECRET;
if (!adminToken) throw new Error("NEO_PADS_ADMIN_TOKEN is required");
if (!webhookSecret) throw new Error("NEO_COUNTER_WEBHOOK_SECRET is required");

const pool = new Pool({ connectionString: databaseUrl });
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const wallet = `1HttpSecurityWallet-${suffix}`;
const propertyTitle = `HTTP Security Pad ${suffix}`;

async function json(response: Response) {
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

try {
  await pool.query(
    `INSERT INTO neo_pads_wallet_verifications(wallet,challenge_id,verified_at,expires_at)
     VALUES($1,$2,now(),now() + interval '1 hour')`,
    [wallet, `http-security-${suffix}`]
  );

  const created = await json(await fetch(`${base}/pads/properties`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      hostWallet: wallet,
      title: propertyTitle,
      location: "Houston",
      priceWorld: 500,
      propertyAuthorityVerified: true
    })
  }));
  assert.equal(created.response.status, 201);
  assert.equal(created.body.propertyAuthorityVerified, false, "client must not self-assert property authority");
  const propertyId = String(created.body.id);
  assert.ok(propertyId);

  const unauthorizedAdmin = await fetch(`${base}/admin/pads/properties/${encodeURIComponent(propertyId)}/authority`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ verified: true })
  });
  assert.equal(unauthorizedAdmin.status, 401, "admin authority endpoint must reject missing token");

  const authorizedAdmin = await json(await fetch(`${base}/admin/pads/properties/${encodeURIComponent(propertyId)}/authority`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ verified: true })
  }));
  assert.equal(authorizedAdmin.response.status, 200);
  assert.equal(authorizedAdmin.body.propertyAuthorityVerified, true);

  await pool.query("UPDATE neo_pads_properties SET status='ACTIVE' WHERE id=$1", [propertyId]);

  const quote = await json(await fetch(`${base}/pads/quotes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      propertyId,
      startsAt: "2031-01-01T15:00:00.000Z",
      endsAt: "2031-01-03T11:00:00.000Z",
      nights: 99,
      amountWorld: 1
    })
  }));
  assert.equal(quote.response.status, 200);
  assert.equal(quote.body.nights, 2);
  assert.equal(quote.body.price?.amount, 1000, "quote price must be derived from stored nightly rate and dates");
  assert.equal(quote.body.price?.symbol, "∞");

  const bookingId = `HTTP-BOOK-${suffix}`;
  await pool.query(
    `INSERT INTO neo_pads_bookings(id,property_id,member_neopass_id,starts_at,ends_at,amount_world,state,entitlement_status)
     VALUES($1,$2,$3,$4,$5,$6,'PAYMENT_PENDING','PENDING')`,
    [bookingId, propertyId, `NP-${suffix}`, "2031-02-01T15:00:00.000Z", "2031-02-03T11:00:00.000Z", 1000]
  );

  const invalidAsset = await json(await fetch(`${base}/pads/reservations/${encodeURIComponent(bookingId)}/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ settlementAsset: "ETH" })
  }));
  assert.equal(invalidAsset.response.status, 400);
  assert.equal(invalidAsset.body.error, "unsupported_settlement_asset");

  const unauthenticatedStatus = await json(await fetch(
    `${base}/pads/reservations/${encodeURIComponent(bookingId)}/status`
  ));
  assert.equal(unauthenticatedStatus.response.status, 401);
  assert.equal(unauthenticatedStatus.body.error, "neopass_authentication_required");

  const incompleteSettlementPayload = Buffer.from(JSON.stringify({
    eventId: `evt-incomplete-${suffix}`,
    bookingId,
    status: "SETTLED"
  }));
  const incompleteSettlementSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(incompleteSettlementPayload)
    .digest("hex");
  const incompleteSettlement = await json(await fetch(`${base}/counter/payment-webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-neo-signature": incompleteSettlementSignature
    },
    body: incompleteSettlementPayload
  }));
  assert.equal(incompleteSettlement.response.status, 400);
  assert.equal(incompleteSettlement.body.error, "invalid_settlement_evidence");
  const pendingBooking = await pool.query("SELECT state,entitlement_status FROM neo_pads_bookings WHERE id=$1", [bookingId]);
  assert.equal(pendingBooking.rows[0].state, "PAYMENT_PENDING");
  assert.equal(pendingBooking.rows[0].entitlement_status, "PENDING");

  const webhookPayload = Buffer.from(JSON.stringify({
    eventId: `evt-invalid-${suffix}`,
    bookingId,
    status: "PAID"
  }));
  const signature = crypto.createHmac("sha256", webhookSecret).update(webhookPayload).digest("hex");
  const invalidWebhook = await json(await fetch(`${base}/counter/payment-webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-neo-signature": signature
    },
    body: webhookPayload
  }));
  assert.equal(invalidWebhook.response.status, 400);
  assert.equal(invalidWebhook.body.error, "unsupported_payment_status");

  await pool.query("UPDATE neo_pads_wallet_verifications SET expires_at=now() - interval '1 second' WHERE wallet=$1", [wallet]);
  const expiredWallet = await json(await fetch(`${base}/pads/properties`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      hostWallet: wallet,
      title: `Expired ${propertyTitle}`,
      location: "Houston",
      priceWorld: 500
    })
  }));
  assert.equal(expiredWallet.response.status, 403);
  assert.equal(expiredWallet.body.error, "verified_host_wallet_required");

  console.log("NEO Pads HTTP trust-boundary security test passed", { propertyId, bookingId });
} finally {
  await pool.end();
}
