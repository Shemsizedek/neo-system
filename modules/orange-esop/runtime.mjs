const SCALE_DIGITS = 18;
const SCALE = 10n ** 18n;

function parseDecimal(value, name) {
  if (typeof value !== "string" || !/^-?\d+(\.\d+)?$/.test(value)) {
    throw new Error(`${name} must be a decimal string`);
  }
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = raw.split(".");
  const padded = (fraction + "0".repeat(SCALE_DIGITS)).slice(0, SCALE_DIGITS);
  const scaled = BigInt(whole) * SCALE + BigInt(padded);
  return negative ? -scaled : scaled;
}

function formatDecimal(value) {
  const negative = value < 0n;
  const raw = negative ? -value : value;
  const whole = raw / SCALE;
  const fraction = (raw % SCALE).toString().padStart(SCALE_DIGITS, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? "." + fraction : ""}`;
}

function assertNonNegative(value, name) {
  const n = parseDecimal(value, name);
  if (n < 0n) throw new Error(`${name} must be non-negative`);
  return n;
}

function assertPositive(value, name) {
  const n = parseDecimal(value, name);
  if (n <= 0n) throw new Error(`${name} must be positive`);
  return n;
}

function mulScaled(a, b) {
  return (a * b) / SCALE;
}

function divScaled(a, b) {
  if (b === 0n) throw new Error("division by zero");
  return (a * SCALE) / b;
}

export function calculateAllocation(input) {
  if (input.eligible !== true) {
    throw new Error("participant must have an authoritative eligible record for the plan year");
  }

  const eligibleCompensation = assertNonNegative(input.eligibleCompensation, "eligibleCompensation");
  const totalEligibleCompensation = assertPositive(input.totalEligibleCompensation, "totalEligibleCompensation");
  const contributionPool = assertNonNegative(input.contributionPool, "contributionPool");
  const fairMarketValuePerShare = assertPositive(input.fairMarketValuePerShare, "fairMarketValuePerShare");
  const tokenRatio = assertNonNegative(input.tokenRatio, "tokenRatio");

  if (eligibleCompensation > totalEligibleCompensation) {
    throw new Error("eligibleCompensation cannot exceed totalEligibleCompensation");
  }

  const compensationRatio = divScaled(eligibleCompensation, totalEligibleCompensation);
  const allocationValue = mulScaled(contributionPool, compensationRatio);
  const employerShares = divScaled(allocationValue, fairMarketValuePerShare);
  const neotrustUnits = mulScaled(employerShares, tokenRatio);

  return {
    allocationValue: formatDecimal(allocationValue),
    employerShares: formatDecimal(employerShares),
    neotrustUnits: formatDecimal(neotrustUnits),
  };
}

export function calculateVesting({ yearsOfService, allocatedNeotrust, schedule }) {
  if (!Number.isFinite(yearsOfService) || yearsOfService < 0) {
    throw new Error("yearsOfService must be a non-negative finite number");
  }
  if (!Array.isArray(schedule) || schedule.length === 0) {
    throw new Error("an adopted plan vesting schedule is required");
  }

  const allocated = assertNonNegative(allocatedNeotrust, "allocatedNeotrust");
  const ordered = [...schedule].sort((a, b) => b.minimumYears - a.minimumYears);
  const band = ordered.find((row) => yearsOfService >= row.minimumYears);
  if (!band || !Number.isFinite(band.percent) || band.percent < 0 || band.percent > 100) {
    throw new Error("no valid vesting band applies");
  }

  const percentScaled = BigInt(Math.round(band.percent * 1_000_000));
  const vested = (allocated * percentScaled) / 100_000_000n;

  return {
    yearsOfService,
    vestingPercent: band.percent,
    allocatedNeotrust: formatDecimal(allocated),
    vestedNeotrust: formatDecimal(vested),
    unvestedNeotrust: formatDecimal(allocated - vested),
  };
}

export function reconcile(input) {
  const errors = [];
  const required = [
    "reserveUnits",
    "suspenseUnits",
    "participantUnits",
    "unusedAuthorizedUnits",
    "representedUnderlyingInterest",
    "documentedUnderlyingInterest",
  ];

  const values = {};
  for (const field of required) {
    try {
      values[field] = assertNonNegative(input[field], field);
    } catch {
      errors.push(`INVALID_OR_MISSING_${field.toUpperCase()}`);
    }
  }

  if (errors.length === 0) {
    const expectedReserve =
      values.suspenseUnits + values.participantUnits + values.unusedAuthorizedUnits;

    if (values.reserveUnits !== expectedReserve) {
      errors.push("RESERVE_IDENTITY_MISMATCH");
    }

    if (values.representedUnderlyingInterest > values.documentedUnderlyingInterest) {
      errors.push("REPRESENTATION_EXCEEDS_UNDERLYING_INTEREST");
    }
  }

  return {
    status: errors.length === 0 ? "PASS" : "RECONCILIATION_HOLD",
    errors,
  };
}
