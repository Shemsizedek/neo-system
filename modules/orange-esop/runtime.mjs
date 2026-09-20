export const DEFAULT_VESTING_SCHEDULE = Object.freeze([
  { minimumYears: 6, percent: 100 },
  { minimumYears: 5, percent: 80 },
  { minimumYears: 4, percent: 60 },
  { minimumYears: 3, percent: 40 },
  { minimumYears: 2, percent: 20 },
  { minimumYears: 0, percent: 0 },
]);

export function calculateAllocation(input) {
  const {
    eligibleCompensation,
    totalEligibleCompensation,
    contributionPool,
    fairMarketValuePerShare,
    tokenRatio,
  } = input;

  if (eligibleCompensation < 0) throw new Error("eligibleCompensation must be non-negative");
  if (totalEligibleCompensation <= 0) throw new Error("totalEligibleCompensation must be positive");
  if (contributionPool < 0) throw new Error("contributionPool must be non-negative");
  if (fairMarketValuePerShare <= 0) throw new Error("fairMarketValuePerShare must be positive");
  if (tokenRatio < 0) throw new Error("tokenRatio must be non-negative");

  const allocationValue = contributionPool * (eligibleCompensation / totalEligibleCompensation);
  const employerShares = allocationValue / fairMarketValuePerShare;
  const neotrustUnits = employerShares * tokenRatio;

  return { allocationValue, employerShares, neotrustUnits };
}

export function calculateVesting(yearsOfService, allocatedNeotrust) {
  if (yearsOfService < 0) throw new Error("yearsOfService must be non-negative");
  if (allocatedNeotrust < 0) throw new Error("allocatedNeotrust must be non-negative");

  const band = DEFAULT_VESTING_SCHEDULE.find((row) => yearsOfService >= row.minimumYears);
  const vestedNeotrust = allocatedNeotrust * (band.percent / 100);

  return {
    yearsOfService,
    vestingPercent: band.percent,
    allocatedNeotrust,
    vestedNeotrust,
    unvestedNeotrust: allocatedNeotrust - vestedNeotrust,
  };
}

export function reconcile(input) {
  const errors = [];
  const expectedReserve =
    input.suspenseUnits + input.participantUnits + input.unusedAuthorizedUnits;

  if (!approximatelyEqual(input.reserveUnits, expectedReserve)) {
    errors.push("RESERVE_IDENTITY_MISMATCH");
  }

  if (input.representedUnderlyingInterest > input.documentedUnderlyingInterest) {
    errors.push("REPRESENTATION_EXCEEDS_UNDERLYING_INTEREST");
  }

  return {
    status: errors.length === 0 ? "PASS" : "RECONCILIATION_HOLD",
    errors,
  };
}

function approximatelyEqual(a, b, tolerance = 1e-8) {
  return Math.abs(a - b) <= tolerance;
}
