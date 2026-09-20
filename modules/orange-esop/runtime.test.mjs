import test from "node:test";
import assert from "node:assert/strict";
import { calculateAllocation, calculateVesting, reconcile } from "./runtime.mjs";

const adoptedSchedule = [
  { minimumYears: 6, percent: 100 },
  { minimumYears: 5, percent: 80 },
  { minimumYears: 4, percent: 60 },
  { minimumYears: 3, percent: 40 },
  { minimumYears: 2, percent: 20 },
  { minimumYears: 0, percent: 0 },
];

test("allocation follows compensation-weighted formula with decimal-safe strings", () => {
  const result = calculateAllocation({
    eligible: true,
    eligibleCompensation: "50000",
    totalEligibleCompensation: "200000",
    contributionPool: "40000",
    fairMarketValuePerShare: "100",
    tokenRatio: "2",
  });

  assert.equal(result.allocationValue, "10000");
  assert.equal(result.employerShares, "100");
  assert.equal(result.neotrustUnits, "200");
});

test("allocation rejects ineligible participants and impossible compensation ratios", () => {
  assert.throws(() => calculateAllocation({
    eligible: false,
    eligibleCompensation: "50000",
    totalEligibleCompensation: "200000",
    contributionPool: "40000",
    fairMarketValuePerShare: "100",
    tokenRatio: "2",
  }));
  assert.throws(() => calculateAllocation({
    eligible: true,
    eligibleCompensation: "300000",
    totalEligibleCompensation: "200000",
    contributionPool: "40000",
    fairMarketValuePerShare: "100",
    tokenRatio: "2",
  }));
});

test("vesting requires and applies the adopted plan schedule", () => {
  assert.equal(calculateVesting({yearsOfService:1, allocatedNeotrust:"1000", schedule:adoptedSchedule}).vestingPercent, 0);
  assert.equal(calculateVesting({yearsOfService:2, allocatedNeotrust:"1000", schedule:adoptedSchedule}).vestedNeotrust, "200");
  assert.equal(calculateVesting({yearsOfService:4, allocatedNeotrust:"1000", schedule:adoptedSchedule}).vestedNeotrust, "600");
  assert.equal(calculateVesting({yearsOfService:6, allocatedNeotrust:"1000", schedule:adoptedSchedule}).vestedNeotrust, "1000");
  assert.throws(() => calculateVesting({yearsOfService:2, allocatedNeotrust:"1000", schedule:[]}));
});

test("reconciliation passes when reserve identity and underlying cap hold", () => {
  const result = reconcile({
    reserveUnits: "1000",
    suspenseUnits: "200",
    participantUnits: "700",
    unusedAuthorizedUnits: "100",
    representedUnderlyingInterest: "900",
    documentedUnderlyingInterest: "1000",
  });
  assert.equal(result.status, "PASS");
});

test("reconciliation holds when underlying data is missing", () => {
  const result = reconcile({
    reserveUnits: "1000",
    suspenseUnits: "200",
    participantUnits: "700",
    unusedAuthorizedUnits: "100",
    representedUnderlyingInterest: null,
    documentedUnderlyingInterest: null,
  });
  assert.equal(result.status, "RECONCILIATION_HOLD");
});

test("reconciliation holds when represented interest exceeds documented interest", () => {
  const result = reconcile({
    reserveUnits: "1000",
    suspenseUnits: "200",
    participantUnits: "700",
    unusedAuthorizedUnits: "100",
    representedUnderlyingInterest: "1100",
    documentedUnderlyingInterest: "1000",
  });
  assert.equal(result.status, "RECONCILIATION_HOLD");
  assert.ok(result.errors.includes("REPRESENTATION_EXCEEDS_UNDERLYING_INTEREST"));
});
