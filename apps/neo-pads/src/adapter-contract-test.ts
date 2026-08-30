import assert from "node:assert/strict";
import http from "node:http";
import { getHomesharesBalance } from "./adapters/counterparty.js";
import { createCheckout } from "./adapters/neo-counter.js";

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/v2/addresses/") && req.url.includes("/balances")) {
    res.setHeader("content-type", "application/json");
    res.setHeader("x-counterparty-height", "999");
    res.setHeader("x-bitcoin-height", "999");
    res.setHeader("x-counterparty-ready", "true");
    res.setHeader("x-ledger-state", "Following");
    res.end(JSON.stringify({ result: [{ asset: "HOMESHARES", quantity: 123000000, quantity_normalized: "1.23000000" }], result_count: 1 }));
    return;
  }

  res.statusCode = 404;
  res.end();
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("test_server_failed");
const base = `http://127.0.0.1:${address.port}`;

try {
  process.env.COUNTERPARTY_BALANCE_URL = "";
  process.env.COUNTERPARTY_CORE_URL = base;
  const balance = await getHomesharesBalance("1TestWallet");
  assert.equal(balance.quantity, 1.23, "must prefer Counterparty quantity_normalized over base-unit quantity");
  assert.equal(balance.ready, true);
  assert.equal(balance.ledgerState, "Following");
  assert.equal(balance.counterpartyHeight, 999);

  process.env.NODE_ENV = "test";
  process.env.NEO_COUNTER_CHECKOUT_URL = `${base}/neo-counter/`;
  process.env.NEO_PADS_CHECKOUT_RETURN_URL = `${base}/pads/booking/{bookingId}`;
  process.env.NEO_PADS_CHECKOUT_CANCEL_URL = `${base}/pads/booking/{bookingId}`;
  const checkout = await createCheckout({
    bookingId: "NPB-TEST",
    amountWorld: 500,
    payoutWallet: "1HostWallet",
    settlementAsset: "BTC"
  });

  assert.equal(checkout.checkoutId, "NPB-TEST");
  assert.equal(checkout.status, "REDIRECT_REQUIRED");
  assert.equal(checkout.commercialPrice.amount, 500);
  assert.equal(checkout.commercialPrice.currency, "WORLD_CURRENCY");
  assert.equal(checkout.commercialPrice.symbol, "∞");

  const url = new URL(checkout.checkoutUrl);
  assert.equal(url.pathname, "/neo-counter/");
  assert.equal(url.searchParams.get("checkout"), "1");
  assert.equal(url.searchParams.get("service"), "NEO Pads");
  assert.equal(url.searchParams.get("order"), "NPB-TEST");
  assert.equal(url.searchParams.get("amount"), "50000");
  assert.equal(url.searchParams.get("currency"), "WORLD_CURRENCY");
  assert.equal(url.searchParams.get("rail"), "BTC");
  assert.equal(url.searchParams.get("success_url"), `${base}/pads/booking/NPB-TEST`);
  assert.equal(url.searchParams.get("cancel_url"), `${base}/pads/booking/NPB-TEST`);

  console.log("NEO Pads adapter contract test passed");
} finally {
  server.close();
}
