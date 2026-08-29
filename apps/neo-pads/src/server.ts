import express from "express";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8788);
const HOMESHARES = "HOMESHARES";
const ORANGE_CHIP_WALLET = "1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8";

type BookingState =
  | "DRAFT"
  | "AVAILABLE"
  | "QUOTED"
  | "RESERVED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "ACCESS_READY"
  | "CHECKED_IN"
  | "ACTIVE_STAY"
  | "CHECKED_OUT"
  | "SETTLED"
  | "CLOSED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "DISPUTED"
  | "SUSPENDED";

interface Property {
  id: string;
  hostWallet: string;
  title: string;
  location: string;
  priceWorld: number;
  propertyAuthorityVerified: boolean;
  status: "PENDING" | "ACTIVE";
}

interface Booking {
  id: string;
  propertyId: string;
  memberNeopassId: string;
  startsAt: string;
  endsAt: string;
  amountWorld: number;
  state: BookingState;
  entitlement: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED";
}

const properties = new Map<string, Property>();
const bookings = new Map<string, Booking>();

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getHomesharesBalance(wallet: string): Promise<number> {
  const endpoint = process.env.COUNTERPARTY_BALANCE_URL;
  if (!endpoint) return 0;

  const url = new URL(endpoint);
  url.searchParams.set("address", wallet);
  url.searchParams.set("asset", HOMESHARES);

  const response = await fetch(url, {
    headers: process.env.COUNTERPARTY_API_KEY
      ? { Authorization: `Bearer ${process.env.COUNTERPARTY_API_KEY}` }
      : undefined
  });

  if (!response.ok) throw new Error(`Counterparty balance lookup failed: ${response.status}`);
  const data = (await response.json()) as { balance?: number; quantity?: number };
  return Number(data.balance ?? data.quantity ?? 0);
}

app.get("/health", (_req, res) => {
  res.json({
    service: "NEO_PADS",
    status: "ok",
    pricing: { currency: "WORLD_CURRENCY", symbol: "∞" },
    hostAsset: HOMESHARES,
    orangeChipWallet: ORANGE_CHIP_WALLET
  });
});

app.get("/counterparty/:wallet/homeshares", async (req, res) => {
  try {
    const balance = await getHomesharesBalance(req.params.wallet);
    res.json({ wallet: req.params.wallet, asset: HOMESHARES, balance });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "balance_lookup_failed" });
  }
});

app.post("/neoworks/host/authorize", async (req, res) => {
  const { wallet, walletSignatureVerified, propertyAuthorityVerified } = req.body ?? {};
  if (!wallet || walletSignatureVerified !== true) {
    return res.status(400).json({ authorized: false, reason: "wallet_signature_required" });
  }
  if (propertyAuthorityVerified !== true) {
    return res.status(400).json({ authorized: false, reason: "property_authority_required" });
  }

  try {
    const balance = await getHomesharesBalance(wallet);
    const authorized = balance >= 1;
    return res.status(authorized ? 200 : 403).json({
      authorized,
      wallet,
      asset: HOMESHARES,
      balance,
      policy: "MVP_PROVISIONAL_MINIMUM_1"
    });
  } catch (error) {
    return res.status(502).json({ authorized: false, reason: "balance_lookup_failed" });
  }
});

app.post("/pads/properties", (req, res) => {
  const { hostWallet, title, location, priceWorld, propertyAuthorityVerified } = req.body ?? {};
  if (!hostWallet || !title || !location || !Number.isFinite(Number(priceWorld))) {
    return res.status(400).json({ error: "invalid_property" });
  }

  const property: Property = {
    id: id("NP"),
    hostWallet,
    title,
    location,
    priceWorld: Number(priceWorld),
    propertyAuthorityVerified: propertyAuthorityVerified === true,
    status: "PENDING"
  };
  properties.set(property.id, property);
  res.status(201).json(property);
});

app.get("/pads/search", (req, res) => {
  const location = String(req.query.location ?? "").toLowerCase();
  const results = [...properties.values()].filter(
    (property) => property.status === "ACTIVE" && (!location || property.location.toLowerCase().includes(location))
  );
  res.json({ currency: "WORLD_CURRENCY", symbol: "∞", results });
});

app.post("/pads/properties/:id/activate", async (req, res) => {
  const property = properties.get(req.params.id);
  if (!property) return res.status(404).json({ error: "property_not_found" });
  if (!property.propertyAuthorityVerified) {
    return res.status(403).json({ error: "property_authority_required" });
  }

  try {
    const balance = await getHomesharesBalance(property.hostWallet);
    if (balance < 1) return res.status(403).json({ error: "homeshares_required", balance });
    property.status = "ACTIVE";
    res.json(property);
  } catch {
    res.status(502).json({ error: "balance_lookup_failed" });
  }
});

app.post("/pads/quotes", (req, res) => {
  const { propertyId, nights = 1 } = req.body ?? {};
  const property = properties.get(propertyId);
  if (!property || property.status !== "ACTIVE") return res.status(404).json({ error: "listing_unavailable" });

  const count = Math.max(1, Number(nights));
  const amount = property.priceWorld * count;
  res.json({
    quoteId: id("NPQ"),
    propertyId,
    price: { amount, currency: "WORLD_CURRENCY", symbol: "∞" },
    settlement: { adapter: "NEO_COUNTER", status: "NOT_STARTED" }
  });
});

app.post("/pads/reservations", (req, res) => {
  const { propertyId, memberNeopassId, startsAt, endsAt, amountWorld } = req.body ?? {};
  const property = properties.get(propertyId);
  if (!property || property.status !== "ACTIVE") return res.status(404).json({ error: "listing_unavailable" });
  if (!memberNeopassId || !startsAt || !endsAt) return res.status(400).json({ error: "invalid_reservation" });

  const booking: Booking = {
    id: id("NPB"),
    propertyId,
    memberNeopassId,
    startsAt,
    endsAt,
    amountWorld: Number(amountWorld ?? property.priceWorld),
    state: "PAYMENT_PENDING",
    entitlement: "PENDING"
  };
  bookings.set(booking.id, booking);
  res.status(201).json(booking);
});

app.post("/counter/payment-webhook", (req, res) => {
  const { bookingId, status } = req.body ?? {};
  const booking = bookings.get(bookingId);
  if (!booking) return res.status(404).json({ error: "booking_not_found" });

  if (status === "SETTLED") {
    booking.state = "CONFIRMED";
    booking.entitlement = "ACTIVE";
  } else if (status === "REFUNDED") {
    booking.state = "REFUNDED";
    booking.entitlement = "REVOKED";
  }

  res.json(booking);
});

app.get("/neoworks/entitlements/:bookingId", (req, res) => {
  const booking = bookings.get(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "booking_not_found" });
  res.json({
    bookingId: booking.id,
    memberNeopassId: booking.memberNeopassId,
    propertyId: booking.propertyId,
    type: "OCCUPANCY",
    startsAt: booking.startsAt,
    expiresAt: booking.endsAt,
    status: booking.entitlement
  });
});

app.listen(PORT, () => {
  console.log(`NEO Pads API listening on :${PORT}`);
});
