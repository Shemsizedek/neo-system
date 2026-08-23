import {
  buildIntentionCandidate,
  classifyPredictionMechanism,
  type EvidenceClass,
  type IntentionCandidate,
  type OracleConfidence,
  type PsiObservation,
  type PsiSignalKind
} from './neoOraclePsitronics'

export type SensorChannel = {
  id: string
  kind: PsiSignalKind
  enabled: boolean
  consentRequired: boolean
  localPreferred: boolean
  samplingMode: 'EVENT' | 'CONTINUOUS' | 'WINDOWED'
  notes: string[]
}

export type FusionWeight = {
  signalKind: PsiSignalKind
  weight: number
  rationale: string
}

export type FusionWindow = {
  id: string
  startedAt: string
  endedAt: string
  observations: PsiObservation[]
  consentIds: string[]
}

export type FusionFeature = {
  name: string
  signalKind: PsiSignalKind
  value: number
  evidenceClass: EvidenceClass
  contributingObservationIds: string[]
}

export type FusionAssessment = {
  windowId: string
  mechanism: ReturnType<typeof classifyPredictionMechanism>
  features: FusionFeature[]
  candidates: IntentionCandidate[]
  confidence: OracleConfidence
  warnings: string[]
  audit: {
    observationCount: number
    signalKinds: PsiSignalKind[]
    consentIds: string[]
    localFirstEligible: boolean
  }
}

export type FusionPolicy = {
  minimumSignalsForMultimodal: number
  requireConsentFor: PsiSignalKind[]
  rejectUnconsentedSensitiveSignals: boolean
  normalizeWeights: boolean
  minimumCandidateProbability: number
}

export const neoOracleSensorChannelsV1: SensorChannel[] = [
  { id: 'CH-CONTEXT', kind: 'CONTEXTUAL', enabled: true, consentRequired: false, localPreferred: true, samplingMode: 'EVENT', notes: ['Use only context intentionally available to the active interaction.'] },
  { id: 'CH-KEYSTROKE', kind: 'KEYSTROKE', enabled: true, consentRequired: true, localPreferred: true, samplingMode: 'EVENT', notes: ['Timing and correction patterns can support pre-typing intention research.'] },
  { id: 'CH-GAZE', kind: 'GAZE', enabled: false, consentRequired: true, localPreferred: true, samplingMode: 'WINDOWED', notes: ['Opt-in only; do not infer sensitive traits.'] },
  { id: 'CH-VOICE-PRE', kind: 'VOICE_PRECURSOR', enabled: false, consentRequired: true, localPreferred: true, samplingMode: 'WINDOWED', notes: ['For silent-speech or pre-phonation research with explicit opt-in.'] },
  { id: 'CH-EMG', kind: 'EMG', enabled: false, consentRequired: true, localPreferred: true, samplingMode: 'WINDOWED', notes: ['Physiological inference layer.'] },
  { id: 'CH-EEG', kind: 'EEG', enabled: false, consentRequired: true, localPreferred: true, samplingMode: 'WINDOWED', notes: ['Neural-decoding research only; never relabel prediction as direct thought access.'] },
  { id: 'CH-IMPLANT', kind: 'NEURAL_IMPLANT', enabled: false, consentRequired: true, localPreferred: true, samplingMode: 'WINDOWED', notes: ['Reserved for clinically appropriate research contexts and explicit informed consent.'] }
]

export const neoOracleFusionWeightsV1: FusionWeight[] = [
  { signalKind: 'CONTEXTUAL', weight: 0.30, rationale: 'Useful but indirect indicator of likely communicative intent.' },
  { signalKind: 'KEYSTROKE', weight: 0.25, rationale: 'Behavioral evidence tied closely to the active composition task.' },
  { signalKind: 'GAZE', weight: 0.10, rationale: 'Supporting attentional signal; not semantic proof.' },
  { signalKind: 'VOICE_PRECURSOR', weight: 0.15, rationale: 'Can support intended speech inference when validated.' },
  { signalKind: 'EMG', weight: 0.10, rationale: 'Physiological support signal.' },
  { signalKind: 'EEG', weight: 0.10, rationale: 'Neural signal requires subject-specific validation and careful calibration.' },
  { signalKind: 'NEURAL_IMPLANT', weight: 0.10, rationale: 'Potentially high information density, but model validity remains experiment-specific.' }
]

export const neoOracleFusionPolicyV1: FusionPolicy = {
  minimumSignalsForMultimodal: 2,
  requireConsentFor: ['KEYSTROKE', 'GAZE', 'VOICE_PRECURSOR', 'EMG', 'EEG', 'NEURAL_IMPLANT', 'PHYSIOLOGICAL'],
  rejectUnconsentedSensitiveSignals: true,
  normalizeWeights: true,
  minimumCandidateProbability: 0.5
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function consentSatisfied(observation: PsiObservation, policy: FusionPolicy): boolean {
  if (!policy.requireConsentFor.includes(observation.signalKind)) return true
  return Boolean(observation.consentId)
}

function effectiveWeights(weights: FusionWeight[], policy: FusionPolicy): Map<PsiSignalKind, number> {
  const map = new Map<PsiSignalKind, number>()
  const positive = weights.filter(w => w.weight > 0)
  const sum = positive.reduce((n, w) => n + w.weight, 0)
  for (const item of positive) {
    map.set(item.signalKind, policy.normalizeWeights && sum > 0 ? item.weight / sum : item.weight)
  }
  return map
}

export function validateFusionWindow(window: FusionWindow, policy: FusionPolicy = neoOracleFusionPolicyV1): string[] {
  const warnings: string[] = []
  if (!window.observations.length) warnings.push('Fusion window contains no observations.')
  const unconsented = window.observations.filter(o => !consentSatisfied(o, policy))
  if (unconsented.length) warnings.push(`Sensitive observations without consent: ${unconsented.map(o => o.id).join(', ')}`)
  if (new Date(window.endedAt).getTime() < new Date(window.startedAt).getTime()) warnings.push('Fusion window end precedes start.')
  return warnings
}

export function extractFusionFeatures(window: FusionWindow): FusionFeature[] {
  return window.observations
    .filter(o => typeof o.value === 'number')
    .map(o => ({
      name: o.featureName,
      signalKind: o.signalKind,
      value: Number(o.value),
      evidenceClass: o.evidenceClass,
      contributingObservationIds: [o.id]
    }))
}

export function scoreCandidateFromSignals(input: {
  label: string
  perSignalProbability: Partial<Record<PsiSignalKind, number>>
  observations: PsiObservation[]
  weights?: FusionWeight[]
  policy?: FusionPolicy
  explanation?: string[]
}): IntentionCandidate {
  const policy = input.policy ?? neoOracleFusionPolicyV1
  const weights = effectiveWeights(input.weights ?? neoOracleFusionWeightsV1, policy)
  const usable = policy.rejectUnconsentedSensitiveSignals
    ? input.observations.filter(o => consentSatisfied(o, policy))
    : input.observations

  let weighted = 0
  let totalWeight = 0
  for (const observation of usable) {
    const p = input.perSignalProbability[observation.signalKind]
    const w = weights.get(observation.signalKind) ?? 0
    if (typeof p !== 'number' || w <= 0) continue
    weighted += clamp01(p) * w
    totalWeight += w
  }
  const probability = totalWeight > 0 ? weighted / totalWeight : 0
  return buildIntentionCandidate({
    label: input.label,
    probability,
    observations: usable,
    explanation: [
      `Fused ${new Set(usable.map(o => o.signalKind)).size} signal kind(s).`,
      ...(input.explanation ?? [])
    ]
  })
}

export function assessFusionWindow(input: {
  window: FusionWindow
  candidateModels: Array<{
    label: string
    perSignalProbability: Partial<Record<PsiSignalKind, number>>
    explanation?: string[]
  }>
  policy?: FusionPolicy
  weights?: FusionWeight[]
}): FusionAssessment {
  const policy = input.policy ?? neoOracleFusionPolicyV1
  const warnings = validateFusionWindow(input.window, policy)
  const observations = policy.rejectUnconsentedSensitiveSignals
    ? input.window.observations.filter(o => consentSatisfied(o, policy))
    : input.window.observations
  const candidates = input.candidateModels
    .map(model => scoreCandidateFromSignals({
      label: model.label,
      perSignalProbability: model.perSignalProbability,
      observations,
      weights: input.weights,
      policy,
      explanation: model.explanation
    }))
    .filter(c => c.probability >= policy.minimumCandidateProbability)
    .sort((a, b) => b.probability - a.probability)

  const top = candidates[0]
  const kinds = [...new Set(observations.map(o => o.signalKind))]
  const confidence: OracleConfidence = top?.confidence ?? 'UNASSESSED'
  if (kinds.length < policy.minimumSignalsForMultimodal && classifyPredictionMechanism(observations) === 'MULTIMODAL') {
    warnings.push('Multimodal classification did not meet configured minimum-signal threshold.')
  }

  return {
    windowId: input.window.id,
    mechanism: classifyPredictionMechanism(observations),
    features: extractFusionFeatures({ ...input.window, observations }),
    candidates,
    confidence,
    warnings,
    audit: {
      observationCount: observations.length,
      signalKinds: kinds,
      consentIds: [...new Set(observations.map(o => o.consentId).filter((x): x is string => Boolean(x)))],
      localFirstEligible: observations.every(o => o.signalKind !== 'NEURAL_IMPLANT')
    }
  }
}

export const neoOracleSensorFusionV1 = {
  id: 'NEO-ORACLE-SENSOR-FUSION',
  version: '1.0.0',
  purpose: 'Fuse consented behavioral, contextual, physiological, and neural observations into auditable probabilistic intention candidates.',
  principles: [
    'Prediction is not permission.',
    'No hidden signal may silently dominate the fusion result.',
    'Keep behavioral prediction, physiological inference, and neural decoding distinguishable.',
    'Prefer local-first processing for intimate signals.',
    'Every candidate must retain uncertainty and provenance.',
    'A fused score is an engineering estimate, not proof of private thought.'
  ],
  channels: neoOracleSensorChannelsV1,
  weights: neoOracleFusionWeightsV1,
  policy: neoOracleFusionPolicyV1,
  validateFusionWindow,
  extractFusionFeatures,
  scoreCandidateFromSignals,
  assessFusionWindow
} as const
