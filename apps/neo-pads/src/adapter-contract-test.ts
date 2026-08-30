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

  if (req.url === "/checkout" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const parsed = JSON.parse(body);
      assert.equal(parsed.commercialPrice.currency, "WORLD_CURRENCY");
      assert.equal(parsed.commercialPrice.symbol, "∞");
      assert.equal(parsed.settlementAsset, "BTC");
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ checkoutId: "CHK-TEST-1", status: "CREATED" }));
    });
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

  process.env.NEO_COUNTER_API_URL = base;
  const checkout = await createCheckout({
    bookingId: "NPB-TEST",
    amountWorld: 500,
    payoutWallet: "1HostWallet",
    settlementAsset: "BTC"
  });
  assert.equal(checkout.checkoutId, "CHK-TEST-1");

  console.log("NEO Pads adapter contract test passed");
} finally {
  server.close();
}
