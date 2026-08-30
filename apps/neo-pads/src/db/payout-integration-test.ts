import assert from "node:assert/strict";
import { Pool } from "pg";
import { materializePayouts, submitPendingPayouts } from "../payout-worker.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_required");

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const suffix = Date.now().toString(36);
  const propertyId = `PROP-${suffix}`;
  const bookingId = `BOOK-${suffix}`;
  const paymentId = `PAY-${suffix}`;

  await pool.query(
    `INSERT INTO neo_pads_properties(id,host_wallet,title,location,price_world,property_authority_verified,status)
     VALUES($1,$2,'Payout Test Pad','Test City',100,true,'ACTIVE')`,
    [propertyId, `wallet-${suffix}`]
  );

  await pool.query(
    `INSERT INTO neo_pads_bookings(id,property_id,member_neopass_id,starts_at,ends_at,amount_world,state,entitlement_status)
     VALUES($1,$2,'member-test',now()+interval '10 days',now()+interval '11 days',100,'CONFIRMED','ACTIVE')`,
    [bookingId, propertyId]
  );

  await pool.query(
    `INSERT INTO neo_pads_payments(id,booking_id,commercial_amount_world,settlement_asset,network_amount,network_fee,status,settled_at)
     VALUES($1,$2,100,'BTC',0.01000000,0.00010000,'SETTLED',now())`,
    [paymentId, bookingId]
  );

  const first = await materializePayouts(pool);
  assert.equal(first, 1, "one payout obligation should be materialized");

  const second = await materializePayouts(pool);
  assert.equal(second, 0, "re-running materialization must be idempotent");

  const { rows } = await pool.query(
    "SELECT booking_id,settlement_asset,amount,status FROM neo_pads_host_payouts WHERE booking_id=$1",
    [bookingId]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].settlement_asset, "BTC");
  assert.equal(Number(rows[0].amount), 0.0099);
  assert.equal(rows[0].status, "PENDING");

  delete process.env.NEO_PADS_PAYOUT_EXECUTION_ENABLED;
  const dry = await submitPendingPayouts(pool);
  assert.deepEqual(dry, { submitted: 0, failed: 0 }, "payout execution must be opt-in");

  console.log("NEO Pads payout integration test passed");
}

main()
  .finally(() => pool.end())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
