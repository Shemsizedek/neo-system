import test from "node:test";
import assert from "node:assert/strict";
import { createOracleSettlementVerifier } from "./settlement-verifier.mjs";

const subject = "google:member-0001";
const product = "oracle.premium";
const now = () => 1_800_000_000_000;
const invoice = {
  subject, product, status: "SETTLED", refunded: false, revoked: false,
  paymentId: "pay-1", chainReference: "confirmed-chain-tx", rail: "BITCOIN",
  asset: "BTC", destination: "bc1merchant", amountAtomic: 12000,
  activeUntilMs: now() + 60000
};
const chain = {
  verified: true, reference: invoice.chainReference, rail: invoice.rail,
  asset: invoice.asset, destination: invoice.destination, amountAtomic: invoice.amountAtomic,
  confirmations: 6, canonical: true, reorged: false
};
function verifier(changes = {}, chainChanges = {}, extra = {}) {
  return createOracleSettlementVerifier({
    now,
    lookupEntitlement: async () => ({ ...invoice, ...changes }),
    verifyChainSettlement: async () => ({ ...chain, ...chainChanges }),
    ...extra
  });
}
test("refuses missing independently trusted settlement sources", () => {
  assert.throws(() => createOracleSettlementVerifier(), /sources_required/);
  assert.throws(() => createOracleSettlementVerifier({
    lookupEntitlement() {}, verifyChainSettlement() {}, minimumConfirmations: 0
  }), /policy_invalid/);
});
test("requires independently confirmed canonical settlement and exact invoice", async () => {
  const result = await verifier()({ subject, product });
  assert.deepEqual(result, { verified: true, source: "neo-counter", status: "settled",
    subject, product, activeUntilMs: invoice.activeUntilMs });
});
test("refuses unpaid, refunded, revoked, unbound or expired invoices", async () => {
  for (const change of [
    { status: "PENDING" }, { status: "DETECTED" }, { status: "FAILED" },
    { refunded: true }, { revoked: true }, { subject: "other" },
    { product: "other" }, { chainReference: "" }, { paymentId: "" },
    { rail: "ETHEREUM" }, { amountAtomic: 0 },
    { activeUntilMs: now() - 1 }, { destination: "" }
  ]) {
    assert.deepEqual(await verifier(change)({subject, product}), {verified: false});
  }
});
test("rejects counterfeited or incomplete blockchain evidence, insufficient confirmations and reorgs", async () => {
  for (const change of [
    { verified: false }, { reference: "different" }, { rail: "COUNTERPARTY" },
    { asset: "XCP" }, { destination: "attacker" }, { amountAtomic: 12001 },
    { confirmations: 5 }, { canonical: false }, { reorged: true }
  ]) {
    assert.deepEqual(await verifier({}, change)({subject, product}), {verified: false});
  }
});
test("requires fresh evidence for each authorization attempt", async () => {
  let checks = 0;
  const verify = createOracleSettlementVerifier({
    now, lookupEntitlement: async () => invoice,
    verifyChainSettlement: async () => { checks++; return checks === 1 ? chain : {...chain, confirmations: 0}; }
  });
  assert.equal((await verify({subject, product})).verified, true);
  assert.equal((await verify({subject, product})).verified, false);
  assert.equal(checks, 2);
});
test("must not trust a browser-supplied payment status or reference", async () => {
  assert.deepEqual(await verifier()({subject, product, paymentId:"browser-order", status:"SETTLED"}), {
    verified:true, source:"neo-counter", status:"settled", subject, product, activeUntilMs:invoice.activeUntilMs
  });
  assert.deepEqual(await verifier()({subject:"someone-else", product}), {verified:false});
});
