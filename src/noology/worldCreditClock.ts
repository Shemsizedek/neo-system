export type WorldCreditClockConfig = {
  /** Earliest evidence-backed or provisional epoch for the clock. */
  epoch: Date
  /** Whole NOMNI credited per person-hour. */
  nomniPerPersonHour: bigint
  /** Population used for the snapshot. */
  population: bigint
}

export type WorldCreditClockSnapshot = {
  asOf: Date
  elapsedWholeHours: bigint
  nomniPerHour: bigint
  nomniPerDay: bigint
  nomniPer365DayYear: bigint
  cumulativeNomni: bigint
  aliases: readonly ['World Credit Clock', 'Clock of Destiny', 'Cloak of Destiny']
}

const MS_PER_HOUR = 3_600_000
const HOURS_PER_DAY = 24n
const HOURS_PER_365_DAY_YEAR = 8_760n

/**
 * The World Credit Clock is an internal mutual-credit/time-bank model.
 *
 * It measures modeled credit generation from population, elapsed time and the
 * NEO conversion rate. It intentionally returns bigint values because global
 * cumulative NOMNI totals can exceed JavaScript's safe integer range.
 *
 * This engine does not silently convert NOMNI quantities into fiat value,
 * market capitalization, legal debt or a receivable. Those are separate
 * evidence and accounting layers in the NEO System.
 */
export function calculateWorldCreditClock(
  config: WorldCreditClockConfig,
  asOf: Date = new Date()
): WorldCreditClockSnapshot {
  if (config.nomniPerPersonHour < 0n) {
    throw new RangeError('nomniPerPersonHour must be non-negative')
  }

  if (config.population < 0n) {
    throw new RangeError('population must be non-negative')
  }

  const elapsedMs = asOf.getTime() - config.epoch.getTime()
  const elapsedWholeHours = elapsedMs <= 0 ? 0n : BigInt(Math.floor(elapsedMs / MS_PER_HOUR))
  const nomniPerHour = config.population * config.nomniPerPersonHour

  return {
    asOf,
    elapsedWholeHours,
    nomniPerHour,
    nomniPerDay: nomniPerHour * HOURS_PER_DAY,
    nomniPer365DayYear: nomniPerHour * HOURS_PER_365_DAY_YEAR,
    cumulativeNomni: nomniPerHour * elapsedWholeHours,
    aliases: ['World Credit Clock', 'Clock of Destiny', 'Cloak of Destiny']
  }
}

export type PopulationPeriod = {
  start: Date
  end: Date
  population: bigint
}

/**
 * Preferred historical calculation when population changes across periods.
 * Each period is credited only for whole hours inside its own population band.
 */
export function calculatePopulationWeightedNomni(
  periods: PopulationPeriod[],
  nomniPerPersonHour: bigint
): bigint {
  if (nomniPerPersonHour < 0n) {
    throw new RangeError('nomniPerPersonHour must be non-negative')
  }

  return periods.reduce((total, period) => {
    if (period.population < 0n) throw new RangeError('population must be non-negative')
    const elapsedMs = period.end.getTime() - period.start.getTime()
    if (elapsedMs <= 0) return total
    const hours = BigInt(Math.floor(elapsedMs / MS_PER_HOUR))
    return total + period.population * nomniPerPersonHour * hours
  }, 0n)
}

export const defaultWorldCreditRate = 33n
