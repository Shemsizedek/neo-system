import test from "node:test";
import assert from "node:assert/strict";
import { calculateAllocation, calculateVesting, reconcile } from "./runtime.mjs";

test("allocation follows compensation-weighted formula", () => {
  const result = calculateAllocation({
    eligibleCompensation: 50_000,
    totalEligibleCompensation: 200_000,
    contributionPool: 40_000,
    fairMarketValuePerShare: 100,
    tokenRatio: 2,
  });

  assert.equal(result.allocationValue, 10_000);
  assert.equal(result.employerShares, 100);
  assert.equal(result.neotrustUnits, 200);
});

test("vesting applies the v0.1 graded schedule", () => {
  assert.equal(calculateVesting(1, 1000).vestingPercent, 0);
  assert.equal(calculateVesting(2, 1000).vestedNeotrust, 200);
  assert.equal(calculateVesting(4, 1000).vestedNeotrust, 600);
  assert.equal(calculateVesting(6, 1000).vestedNeotrust, 1000);
});

test("reconciliation passes when reserve identity and underlying cap hold", () => {
  const result = reconcile({
    reserveUnits: 1000,
    suspenseUnits: 200,
    participantUnits: 700,
    unusedAuthorizedUnits: 100,
    representedUnderlyingInterest: 900,
    documentedUnderlyingInterest: 1000,
  });
  assert.equal(result.status, "PASS");
});

test("reconciliation holds when represented interest exceeds documented interest", () => {
  const result = reconcile({
    reserveUnits: 1000,
    suspenseUnits: 200,
    participantUnits: 700,
    unusedAuthorizedUnits: 100,
    representedUnderlyingInterest: 1100,
    documentedUnderlyingInterest: 1000,
  });
  assert.equal(result.status, "RECONCILIATION_HOLD");
  assert.ok(result.errors.includes("REPRESENTATION_EXCEEDS_UNDERLYING_INTEREST"));
});
