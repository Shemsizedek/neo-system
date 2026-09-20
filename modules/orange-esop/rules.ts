import {
  AllocationInput,
  AllocationResult,
  DEFAULT_VESTING_SCHEDULE,
  ReconciliationInput,
  ReconciliationResult,
  VestingResult,
} from "./types";

export function calculateAllocation(input: AllocationInput): AllocationResult {
  if (input.eligibleCompensation < 0) throw new Error("eligibleCompensation must be non-negative");
  if (input.totalEligibleCompensation <= 0) throw new Error("totalEligibleCompensation must be positive");
  if (input.contributionPool < 0) throw new Error("contributionPool must be non-negative");
  if (input.fairMarketValuePerShare <= 0) throw new Error("fairMarketValuePerShare must be positive");
  if (input.tokenRatio < 0) throw new Error("tokenRatio must be non-negative");

  const allocationValue =
    input.contributionPool * (input.eligibleCompensation / input.totalEligibleCompensation);
  const employerShares = allocationValue / input.fairMarketValuePerShare;
  const neotrustUnits = employerShares * input.tokenRatio;

  return { allocationValue, employerShares, neotrustUnits };
}

export function calculateVesting(
  yearsOfService: number,
  allocatedNeotrust: number
): VestingResult {
  if (yearsOfService < 0) throw new Error("yearsOfService must be non-negative");
  if (allocatedNeotrust < 0) throw new Error("allocatedNeotrust must be non-negative");

  const band =
    DEFAULT_VESTING_SCHEDULE.find((row) => yearsOfService >= row.minimumYears) ??
    DEFAULT_VESTING_SCHEDULE[DEFAULT_VESTING_SCHEDULE.length - 1];

  const vestedNeotrust = allocatedNeotrust * (band.percent / 100);

  return {
    yearsOfService,
    vestingPercent: band.percent,
    allocatedNeotrust,
    vestedNeotrust,
    unvestedNeotrust: allocatedNeotrust - vestedNeotrust,
  };
}

export function reconcile(input: ReconciliationInput): ReconciliationResult {
  const errors: string[] = [];

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

function approximatelyEqual(a: number, b: number, tolerance = 1e-8): boolean {
  return Math.abs(a - b) <= tolerance;
}
