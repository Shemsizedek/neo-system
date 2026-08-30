import http from "node:http";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { reconcileSubmittedPayouts } from "../payout-reconciler.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_required");
const pool = new Pool({ connectionString: databaseUrl });

const server = http.createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url?.startsWith("/status/")) {
    res.end(JSON.stringify({ status: "SETTLED", txid: "test-chain-txid" }));
    return;
  }
  if (req.url?.startsWith("/chain")) {
    res.end(JSON.stringify({ confirmed: true }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not_found" }));
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("test_server_address_missing");

process.env.NEO_COUNTER_PAYOUT_STATUS_URL = `http://127.0.0.1:${address.port}/status/{payoutId}`;
process.env.NEO_COUNTER_PAYOUT_API_KEY = "test-token";
process.env.NEO_PADS_CHAIN_CONFIRMATION_URL = `http://127.0.0.1:${address.port}/chain`;
process.env.NEO_PADS_REQUIRE_CHAIN_CONFIRMATION = "true";

try {
  const propertyId = "NP-reconcile-property";
  const bookingId = "NPB-reconcile-booking";
  const payoutId = "NPP-reconcile-payout";

  await pool.query("DELETE FROM neo_pads_host_payouts WHERE id=$1 OR booking_id=$2", [payoutId, bookingId]);
  await pool.query("DELETE FROM neo_pads_bookings WHERE id=$1", [bookingId]);
  await pool.query("DELETE FROM neo_pads_properties WHERE id=$1", [propertyId]);

  await pool.query(
    `INSERT INTO neo_pads_properties(id,host_wallet,title,location,price_world,property_authority_verified,status)
     VALUES($1,'test-wallet','Test Pad','Test City',100,true,'ACTIVE')`,
    [propertyId]
  );
  await pool.query(
    `INSERT INTO neo_pads_bookings(id,property_id,member_neopass_id,starts_at,ends_at,amount_world,state,entitlement_status)
     VALUES($1,$2,'test-member',now()+interval '1 day',now()+interval '2 days',100,'CONFIRMED','ACTIVE')`,
    [bookingId, propertyId]
  );
  await pool.query(
    `INSERT INTO neo_pads_host_payouts(id,booking_id,host_wallet,settlement_asset,amount,status,provider_payout_id,provider_status,submitted_at)
     VALUES($1,$2,'test-wallet','BTC',0.001,'SUBMITTED',$1,'SUBMITTED',now())`,
    [payoutId, bookingId]
  );

  const result = await reconcileSubmittedPayouts(pool);
  assert.equal(result.checked, 1);
  assert.equal(result.settled, 1);

  const { rows } = await pool.query("SELECT status,provider_status,txid,confirmed_at FROM neo_pads_host_payouts WHERE id=$1", [payoutId]);
  assert.equal(rows[0].status, "SETTLED");
  assert.equal(rows[0].provider_status, "SETTLED");
  assert.equal(rows[0].txid, "test-chain-txid");
  assert.ok(rows[0].confirmed_at);

  console.log("payout reconciliation integration test passed");
} finally {
  await pool.end();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
