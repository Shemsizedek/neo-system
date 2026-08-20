export type EthericPole = 'SIX_ETHER' | 'BALANCED_FIELD' | 'NINE_ETHER'

export type PolarityPhase = 'YIN' | 'YANG' | 'DYNAMIC_BALANCE'

export type EthericPotencyAssessment = {
  /**
   * Internal NEO symbolic scale from -9 to +9.
   * Negative values model contraction/disorder; positive values model
   * coherence/creative order. This is not a physical-science measurement.
   */
  potency: number
  pole: EthericPole
  polarity: PolarityPhase
  qualitativeLevel:
    | 'DEPLETED'
    | 'LOW'
    | 'TRANSITIONAL'
    | 'BALANCED'
    | 'ELEVATED'
    | 'HIGH'
  reasons: string[]
}

export type EthericSignals = {
  truthfulness?: number
  coherence?: number
  stewardship?: number
  reciprocity?: number
  creativity?: number
  embodiedNatureAlignment?: number
  provenanceIntegrity?: number
  exploitation?: number
  deception?: number
  coercion?: number
  fragmentation?: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const normalized = (value?: number) => clamp(value ?? 0, 0, 1)

/**
 * Quantifies NEO's symbolic 6/9 ether polarity for software routing.
 *
 * The model intentionally treats 6-Ether and 9-Ether as NEO doctrinal/symbolic
 * categories. It does not claim that these scores are laboratory measurements,
 * biological properties, or universal scientific constants.
 */
export function assessEthericPotency(signals: EthericSignals): EthericPotencyAssessment {
  const constructive =
    normalized(signals.truthfulness) +
    normalized(signals.coherence) +
    normalized(signals.stewardship) +
    normalized(signals.reciprocity) +
    normalized(signals.creativity) +
    normalized(signals.embodiedNatureAlignment) +
    normalized(signals.provenanceIntegrity)

  const destructive =
    normalized(signals.exploitation) +
    normalized(signals.deception) +
    normalized(signals.coercion) +
    normalized(signals.fragmentation)

  const constructiveMax = 7
  const destructiveMax = 4
  const constructiveScore = constructive / constructiveMax
  const destructiveScore = destructive / destructiveMax
  const raw = (constructiveScore - destructiveScore) * 9
  const potency = Math.round(clamp(raw, -9, 9) * 100) / 100

  const reasons: string[] = []
  if (constructiveScore >= 0.65) reasons.push('Constructive coherence signals are strong.')
  if (destructiveScore >= 0.5) reasons.push('Destructive or exploitative signals require transmutation.')
  if (normalized(signals.provenanceIntegrity) >= 0.7) reasons.push('Provenance is being preserved.')
  if (normalized(signals.embodiedNatureAlignment) >= 0.7) reasons.push('Nature alignment is materially represented.')
  if (normalized(signals.reciprocity) >= 0.7) reasons.push('Reciprocity and mutuality are strong.')

  let pole: EthericPole
  if (potency <= -2) pole = 'SIX_ETHER'
  else if (potency >= 2) pole = 'NINE_ETHER'
  else pole = 'BALANCED_FIELD'

  let polarity: PolarityPhase
  if (potency < -0.5) polarity = 'YIN'
  else if (potency > 0.5) polarity = 'YANG'
  else polarity = 'DYNAMIC_BALANCE'

  let qualitativeLevel: EthericPotencyAssessment['qualitativeLevel']
  if (potency <= -6) qualitativeLevel = 'DEPLETED'
  else if (potency < -2) qualitativeLevel = 'LOW'
  else if (potency < -0.5) qualitativeLevel = 'TRANSITIONAL'
  else if (potency <= 0.5) qualitativeLevel = 'BALANCED'
  else if (potency < 4) qualitativeLevel = 'ELEVATED'
  else qualitativeLevel = 'HIGH'

  return { potency, pole, polarity, qualitativeLevel, reasons }
}
