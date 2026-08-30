import cors from "cors";
import express from "express";
import { getHomesharesBalance } from "./adapters/counterparty.js";
import { createCheckout } from "./adapters/neo-counter.js";
import { verifyNeopass } from "./adapters/neopass.js";
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

app.use(cors({ origin: process.env.NEO_PADS_WEB_ORIGIN?.split(",").map((v) => v.trim()) || true }));

const PORT = Number(process.env.PORT ?? 8788);
const HOMESHARES = "HOMESHARES";
const ORANGE_CHIP_WALLET = "1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8";

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

    try {
      const result = await repository.applyPaymentEvent({
        eventId: event.eventId,
        bookingId: event.bookingId,
        status: String(event.status ?? "UNKNOWN"),
        rawPayload: rawBody
      });
      return res.status(200).json({ eventId: event.eventId, ...result });
    } catch (error) {
      if (error instanceof Error && error.message === "booking_not_found") {
        return res.status(404).json({ error: "booking_not_found" });
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
  const propertyAuthorityVerified = req.body?.propertyAuthorityVerified === true;
  if (!wallet || !(await repository.isWalletVerified(wallet))) {
    return res.status(403).json({ authorized: false, reason: "verified_wallet_required" });
  }
  if (!propertyAuthorityVerified) {
    return res.status(403).json({ authorized: false, reason: "property_authority_required" });
  }

  try {
    const balance = await getHomesharesBalance(wallet);
    const authorized = balance.quantity >= 1;
    return res.status(authorized ? 200 : 403).json({
      authorized,
      wallet,
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
  const { hostWallet, title, location, priceWorld, propertyAuthorityVerified } = req.body ?? {};
  if (!hostWallet || !title || !location || !Number.isFinite(Number(priceWorld))) {
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
    priceWorld: Number(priceWorld),
    propertyAuthorityVerified: propertyAuthorityVerified === true,
    status: "PENDING"
  };
  await repository.saveProperty(property);
  return res.status(201).json(property);
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
  const nights = Math.max(1, Number(req.body?.nights ?? 1));
  const amount = property.priceWorld * nights;
  return res.json({
    quoteId: id("NPQ"),
    propertyId: property.id,
    price: { amount, currency: "WORLD_CURRENCY", symbol: "∞" },
    settlement: { adapter: "NEO_COUNTER", status: "NOT_STARTED" }
  });
});

app.post("/pads/reservations", async (req, res) => {
  const { propertyId, memberNeopassId, startsAt, endsAt, amountWorld } = req.body ?? {};
  const property = await repository.getProperty(String(propertyId ?? ""));
  if (!property || property.status !== "ACTIVE") return res.status(404).json({ error: "listing_unavailable" });
  if (!memberNeopassId || !startsAt || !endsAt) return res.status(400).json({ error: "invalid_reservation" });

  try {
    const authHeader = req.header("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const member = await verifyNeopass(String(memberNeopassId), bearer);
    if (!member.verified || !member.accessEligible) return res.status(403).json({ error: "neopass_verification_required" });
  } catch {
    return res.status(502).json({ error: "neopass_unavailable" });
  }

  const booking: BookingRecord = {
    id: id("NPB"),
    propertyId: property.id,
    memberNeopassId: String(memberNeopassId),
    startsAt: String(startsAt),
    endsAt: String(endsAt),
    amountWorld: Number(amountWorld ?? property.priceWorld),
    state: "PAYMENT_PENDING",
    entitlement: "PENDING"
  };

  try {
    await repository.saveBooking(booking);
    return res.status(201).json(booking);
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

  try {
    const checkout = await createCheckout({
      bookingId: booking.id,
      amountWorld: booking.amountWorld,
      payoutWallet: property.hostWallet,
      settlementAsset: req.body?.settlementAsset
    });
    booking.checkout = checkout;
    await repository.saveBooking(booking);
    return res.status(201).json(checkout);
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : "checkout_failed" });
  }
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
