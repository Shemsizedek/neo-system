import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import { getHomesharesBalance } from "./adapters/counterparty.js";
import { createCheckout } from "./adapters/neo-counter.js";
import { verifyNeopass } from "./adapters/neopass.js";
import { bookingStatusPayload, canReadBookingStatus } from "./booking-status.js";
import { attachOpsRoutes } from "./ops.js";
import { createRepository } from "./repository-factory.js";
import type { BookingRecord, PropertyRecord } from "./repository.js";
import {
  consumeWalletChallenge,
  createWalletChallenge,
  getWalletChallenge,
  verifyWalletSignature,
  verifyWebhookSignature
} from "./security.js";

const app = express();
const repository = createRepository();

const configuredOrigins = process.env.NEO_PADS_WEB_ORIGIN
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const corsOrigin = configuredOrigins?.length
  ? configuredOrigins
  : process.env.NODE_ENV === "production"
    ? false
    : true;
app.use(cors({ origin: corsOrigin }));

const PORT = Number(process.env.PORT ?? 8788);
const HOMESHARES = "HOMESHARES";
const ORANGE_CHIP_WALLET = "1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8";
const PAYMENT_EVENT_STATUSES = new Set(["SETTLED", "REFUNDED", "DISPUTED"]);
const SETTLEMENT_ASSETS = new Set(["BTC", "XCP", "NOMNI"]);

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function bearer(req: express.Request) {
  const header = req.header("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

function constantTimeTokenMatch(received: string | undefined, expected: string | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireAdmin(req: express.Request, res: express.Response) {
  const expected = process.env.NEO_PADS_ADMIN_TOKEN;
  if (!expected) {
    res.status(503).json({ error: "admin_token_not_configured" });
    return false;
  }
  if (!constantTimeTokenMatch(bearer(req), expected)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

function parseStay(startsAt: unknown, endsAt: unknown) {
  const start = new Date(String(startsAt ?? ""));
  const end = new Date(String(endsAt ?? ""));
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  const nights = Math.max(1, Math.ceil((endMs - startMs) / 86_400_000));
  return { startsAt: start.toISOString(), endsAt: end.toISOString(), nights };
}

app.post(
  "/counter/payment-webhook",
  express.raw({ type: "application/json", limit: "256kb" }),
  async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    const signature = req.header("x-neo-signature") ?? undefined;
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: "invalid_webhook_signature" });
    }

    let event: { eventId?: string; bookingId?: string; status?: string };
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "invalid_webhook_json" });
    }
    if (!event.eventId || !event.bookingId) {
      return res.status(400).json({ error: "event_id_and_booking_id_required" });
    }

    const status = String(event.status ?? "").toUpperCase();
    if (!PAYMENT_EVENT_STATUSES.has(status)) {
      return res.status(400).json({ error: "unsupported_payment_status" });
    }

    try {
      const result = await repository.applyPaymentEvent({
        eventId: event.eventId,
        bookingId: event.bookingId,
        status,
        rawPayload: rawBody
      });
      return res.status(200).json({ eventId: event.eventId, ...result });
    } catch (error) {
      if (error instanceof Error && error.message === "booking_not_found") {
        return res.status(404).json({ error: "booking_not_found" });
      }
      if (error instanceof Error && error.message === "unsupported_payment_status") {
        return res.status(400).json({ error: "unsupported_payment_status" });
      }
      if (error instanceof Error && error.message === "invalid_settlement_evidence") {
        return res.status(400).json({ error: "invalid_settlement_evidence" });
      }
      return res.status(500).json({ error: "payment_event_persistence_failed" });
    }
  }
);

app.use(express.json({ limit: "256kb" }));
attachOpsRoutes(app, repository);

app.get("/health", (_req, res) => {
  res.json({
    service: "NEO_PADS",
    status: "ok",
    pricing: { currency: "WORLD_CURRENCY", symbol: "∞" },
    hostAsset: HOMESHARES,
    orangeChipWallet: ORANGE_CHIP_WALLET,
    persistence: repository.mode
  });
});

app.post("/wallets/challenge", (req, res) => {
  const wallet = String(req.body?.wallet ?? "").trim();
  if (!wallet) return res.status(400).json({ error: "wallet_required" });
  const challenge = createWalletChallenge(wallet);
  return res.status(201).json({
    challengeId: challenge.id,
    wallet: challenge.wallet,
    message: challenge.message,
    expiresAt: new Date(challenge.expiresAt).toISOString()
  });
});

app.post("/wallets/verify", async (req, res) => {
  const challengeId = String(req.body?.challengeId ?? "");
  const signature = String(req.body?.signature ?? "");
  const challenge = getWalletChallenge(challengeId);
  if (!challenge || !signature) return res.status(400).json({ verified: false, reason: "invalid_challenge" });

  try {
    const verified = await verifyWalletSignature({ challenge, signature });
    if (!verified) return res.status(403).json({ verified: false, reason: "signature_invalid" });
    consumeWalletChallenge(challengeId);
    await repository.markWalletVerified(challenge.wallet, challengeId);
    return res.json({ verified: true, wallet: challenge.wallet, challengeId });
  } catch (error) {
    return res.status(502).json({
      verified: false,
      reason: error instanceof Error ? error.message : "signature_verifier_failed"
    });
  }
});

app.get("/counterparty/:wallet/homeshares", async (req, res) => {
  try {
    return res.json(await getHomesharesBalance(req.params.wallet));
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : "balance_lookup_failed" });
  }
});

app.post("/neoworks/host/authorize", async (req, res) => {
  const wallet = String(req.body?.wallet ?? "").trim();
  const propertyId = String(req.body?.propertyId ?? "").trim();
  if (!wallet || !(await repository.isWalletVerified(wallet))) {
    return res.status(403).json({ authorized: false, reason: "verified_wallet_required" });
  }
  if (!propertyId) return res.status(400).json({ authorized: false, reason: "property_id_required" });

  const property = await repository.getProperty(propertyId);
  if (!property || property.hostWallet !== wallet) {
    return res.status(404).json({ authorized: false, reason: "property_not_found" });
  }
  if (!property.propertyAuthorityVerified) {
    return res.status(403).json({ authorized: false, reason: "property_authority_required" });
  }

  try {
    const balance = await getHomesharesBalance(wallet);
    const authorized = balance.quantity >= 1;
    return res.status(authorized ? 200 : 403).json({
      authorized,
      wallet,
      propertyId,
      asset: HOMESHARES,
      balance: balance.quantity,
      source: balance.source,
      policy: "MVP_PROVISIONAL_MINIMUM_1"
    });
  } catch {
    return res.status(502).json({ authorized: false, reason: "balance_lookup_failed" });
  }
});

app.post("/pads/properties", async (req, res) => {
  const { hostWallet, title, location, priceWorld } = req.body ?? {};
  const price = Number(priceWorld);
  if (!hostWallet || !title || !location || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "invalid_property" });
  }
  if (!(await repository.isWalletVerified(String(hostWallet)))) {
    return res.status(403).json({ error: "verified_host_wallet_required" });
  }

  const property: PropertyRecord = {
    id: id("NP"),
    hostWallet: String(hostWallet),
    title: String(title),
    location: String(location),
    priceWorld: price,
    propertyAuthorityVerified: false,
    status: "PENDING"
  };
  await repository.saveProperty(property);
  return res.status(201).json(property);
});

app.post("/admin/pads/properties/:id/authority", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const property = await repository.getProperty(req.params.id);
  if (!property) return res.status(404).json({ error: "property_not_found" });
  property.propertyAuthorityVerified = req.body?.verified === true;
  if (!property.propertyAuthorityVerified && property.status === "ACTIVE") property.status = "SUSPENDED";
  await repository.saveProperty(property);
  return res.json({
    propertyId: property.id,
    propertyAuthorityVerified: property.propertyAuthorityVerified,
    status: property.status
  });
});

app.get("/pads/search", async (req, res) => {
  const location = String(req.query.location ?? "");
  const results = await repository.listActiveProperties(location);
  return res.json({ currency: "WORLD_CURRENCY", symbol: "∞", results });
});

app.post("/pads/properties/:id/activate", async (req, res) => {
  const property = await repository.getProperty(req.params.id);
  if (!property) return res.status(404).json({ error: "property_not_found" });
  if (!property.propertyAuthorityVerified) return res.status(403).json({ error: "property_authority_required" });
  if (!(await repository.isWalletVerified(property.hostWallet))) {
    return res.status(403).json({ error: "verified_host_wallet_required" });
  }

  try {
    const balance = await getHomesharesBalance(property.hostWallet);
    if (balance.quantity < 1) return res.status(403).json({ error: "homeshares_required", balance: balance.quantity });
    property.status = "ACTIVE";
    await repository.saveProperty(property);
    return res.json(property);
  } catch {
    return res.status(502).json({ error: "balance_lookup_failed" });
  }
});

app.post("/pads/quotes", async (req, res) => {
  const property = await repository.getProperty(String(req.body?.propertyId ?? ""));
  if (!property || property.status !== "ACTIVE") return res.status(404).json({ error: "listing_unavailable" });
  const stay = parseStay(req.body?.startsAt, req.body?.endsAt);
  if (!stay) return res.status(400).json({ error: "valid_stay_dates_required" });
  const amount = property.priceWorld * stay.nights;
  return res.json({
    quoteId: id("NPQ"),
    propertyId: property.id,
    startsAt: stay.startsAt,
    endsAt: stay.endsAt,
    nights: stay.nights,
    price: { amount, currency: "WORLD_CURRENCY", symbol: "∞" },
    settlement: { adapter: "NEO_COUNTER", status: "NOT_STARTED" }
  });
});

app.post("/pads/reservations", async (req, res) => {
  const { propertyId, memberNeopassId, startsAt, endsAt } = req.body ?? {};
  const property = await repository.getProperty(String(propertyId ?? ""));
  if (!property || property.status !== "ACTIVE") return res.status(404).json({ error: "listing_unavailable" });
  if (!memberNeopassId) return res.status(400).json({ error: "invalid_reservation" });

  const stay = parseStay(startsAt, endsAt);
  if (!stay) return res.status(400).json({ error: "valid_stay_dates_required" });

  try {
    const member = await verifyNeopass(String(memberNeopassId), bearer(req));
    if (!member.verified || !member.accessEligible) return res.status(403).json({ error: "neopass_verification_required" });
  } catch {
    return res.status(502).json({ error: "neopass_unavailable" });
  }

  const booking: BookingRecord = {
    id: id("NPB"),
    propertyId: property.id,
    memberNeopassId: String(memberNeopassId),
    startsAt: stay.startsAt,
    endsAt: stay.endsAt,
    amountWorld: property.priceWorld * stay.nights,
    state: "PAYMENT_PENDING",
    entitlement: "PENDING"
  };

  try {
    await repository.saveBooking(booking);
    return res.status(201).json({ ...booking, nights: stay.nights });
  } catch (error: any) {
    if (error?.code === "23P01") return res.status(409).json({ error: "booking_conflict" });
    return res.status(500).json({ error: "reservation_persistence_failed" });
  }
});

app.post("/pads/reservations/:bookingId/checkout", async (req, res) => {
  const booking = await repository.getBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "booking_not_found" });
  const property = await repository.getProperty(booking.propertyId);
  if (!property) return res.status(404).json({ error: "property_not_found" });

  const settlementAsset = String(req.body?.settlementAsset ?? "").toUpperCase();
  if (!SETTLEMENT_ASSETS.has(settlementAsset)) {
    return res.status(400).json({ error: "unsupported_settlement_asset" });
  }

  try {
    const checkout = await createCheckout({
      bookingId: booking.id,
      amountWorld: booking.amountWorld,
      payoutWallet: property.hostWallet,
      settlementAsset: settlementAsset as "BTC" | "XCP" | "NOMNI"
    });
    booking.checkout = checkout;
    await repository.saveBooking(booking);
    return res.status(201).json(checkout);
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : "checkout_failed" });
  }
});

app.get("/pads/reservations/:bookingId/status", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "neopass_authentication_required" });

  const booking = await repository.getBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "booking_not_found" });

  try {
    const member = await verifyNeopass(booking.memberNeopassId, token);
    if (!canReadBookingStatus(booking, member)) {
      return res.status(403).json({ error: "booking_access_denied" });
    }
  } catch {
    return res.status(502).json({ error: "neopass_unavailable" });
  }

  const settlementRecorded = await repository.hasSettledPayment(booking.id);
  return res.json(bookingStatusPayload(booking, settlementRecorded));
});

app.get("/neoworks/entitlements/:bookingId", async (req, res) => {
  const booking = await repository.getBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "booking_not_found" });
  return res.json({
    bookingId: booking.id,
    memberNeopassId: booking.memberNeopassId,
    propertyId: booking.propertyId,
    type: "OCCUPANCY",
    startsAt: booking.startsAt,
    expiresAt: booking.endsAt,
    status: booking.entitlement
  });
});

const server = app.listen(PORT, () => {
  console.log(`NEO Pads API listening on :${PORT} with ${repository.mode} persistence`);
});

async function shutdown() {
  server.close(async () => {
    await repository.close();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
