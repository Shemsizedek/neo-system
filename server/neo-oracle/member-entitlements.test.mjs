import test from "node:test";
import assert from "node:assert/strict";
import { createOraclePremiumGate } from "./member-entitlements.mjs";

const now = () => 1_700_000_000_000;
const token = "server-verified-neopass-bearer-token";
const validSession = () => ({
  verified: true,
  subject: "temple-member-001",
  audience: "neo-oracle",
  scopes: ["oracle.premium"],
  expiresAtMs: now() + 60_000
});
const validEntitlement = ({subject, product}) => ({
  verified: true,
  source: "neo-counter",
  status: "settled",
  subject,
  product,
  activeUntilMs: now() + 60_000
});
const gate = (overrides = {}) => createOraclePremiumGate({
  verifyNeopassSession: async () => validSession(),
  verifySettledEntitlement: async (query) => validEntitlement(query),
  now,
  ...overrides
});

test("no token and unconfigured verifiers fail closed", async () => {
  assert.equal((await gate()({})).status, 401);
  assert.equal((await createOraclePremiumGate({now})({bearerToken: token})).code, "PREMIUM_NOT_CONFIGURED");
});

test("authorized only with independently verified NEOpass and settled entitlement", async () => {
  const result = await gate()({bearerToken: token});
  assert.deepEqual(result, {
    ok: true, status: 200, code: "PREMIUM_AUTHORIZED", subject: "temple-member-001"
  });
});

test("rejects invalid signature status, wrong audience, scope and expiry", async () => {
  for (const change of [
    {verified: false}, {audience: "other-app"}, {scopes: ["oracle.basic"]},
    {expiresAtMs: now() - 1}, {subject: ""}
  ]) {
    const result = await gate({verifyNeopassSession: async () => ({...validSession(), ...change})})({bearerToken: token});
    assert.equal(result.code, "NEOPASS_PREMIUM_DENIED");
  }
});

test("rejects pending, refunded, wrong product, wrong member, and expired payment claims", async () => {
  for (const change of [
    {status: "pending"}, {status: "refunded"}, {source: "browser"},
    {product: "oracle.basic"}, {subject: "different-member"},
    {activeUntilMs: now() - 1}, {verified: false}
  ]) {
    const result = await gate({
      verifySettledEntitlement: async (query) => ({...validEntitlement(query), ...change})
    })({bearerToken: token});
    assert.equal(result.code, "PREMIUM_ENTITLEMENT_DENIED");
  }
});

test("upstream errors return 503 rather than granting access", async () => {
  const identity = await gate({verifyNeopassSession: async () => { throw Error("offline"); }})({bearerToken: token});
  const ledger = await gate({verifySettledEntitlement: async () => { throw Error("offline"); }})({bearerToken: token});
  assert.equal(identity.status, 503);
  assert.equal(ledger.status, 503);
});
