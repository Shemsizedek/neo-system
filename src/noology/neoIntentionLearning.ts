import type { IntentionCandidate, OracleConfidence, PsiObservation, PsiSignalKind } from './neoOraclePsitronics'
import { assessFusionWindow, type FusionAssessment, type FusionWindow } from './neoOracleSensorFusion'

export type LearningMode = 'CALIBRATION' | 'ASSISTIVE' | 'RESEARCH'
export type FeedbackKind = 'CONFIRMED' | 'CORRECTED' | 'REJECTED' | 'SKIPPED'

export type ConsentScope = {
  id: string
  allowedSignals: PsiSignalKind[]
  allowPersonalization: boolean
  allowTemporalLearning: boolean
  allowLocalModelPersistence: boolean
  expiresAt?: string
}

export type IntentionFeedback = {
  id: string
  predictionId: string
  kind: FeedbackKind
  predictedLabel: string
  actualLabel?: string
  timestamp: string
  consentId: string
  notes?: string[]
}

export type TemporalPattern = {
  key: string
  previousLabels: string[]
  nextLabel: string
  count: number
  confidence: number
  lastSeenAt: string
}

export type PersonalCalibration = {
  profileId: string
  signalReliability: Partial<Record<PsiSignalKind, number>>
  labelPrior: Record<string, number>
  temporalPatterns: TemporalPattern[]
  sampleCount: number
  correctionCount: number
  rejectedCount: number
  lastUpdatedAt: string
}

export type LearningPrediction = {
  id: string
  createdAt: string
  baseAssessment: FusionAssessment
  candidates: IntentionCandidate[]
  topCandidate?: IntentionCandidate
  confidence: OracleConfidence
  personalizationApplied: boolean
  temporalContextApplied: boolean
  audit: {
    profileId: string
    consentId: string
    mode: LearningMode
    localOnly: boolean
    historyLabels: string[]
    warnings: string[]
  }
}

export type DriftAssessment = {
  driftDetected: boolean
  recentAccuracy: number
  baselineAccuracy: number
  delta: number
  recommendation: 'NONE' | 'RECALIBRATE' | 'PAUSE_PERSONALIZATION'
}

export const defaultCalibration = (profileId: string, at = new Date().toISOString()): PersonalCalibration => ({
  profileId,
  signalReliability: {},
  labelPrior: {},
  temporalPatterns: [],
  sampleCount: 0,
  correctionCount: 0,
  rejectedCount: 0,
  lastUpdatedAt: at
})

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function consentActive(consent: ConsentScope, now = Date.now()): boolean {
  return !consent.expiresAt || new Date(consent.expiresAt).getTime() >= now
}

function patternBoost(calibration: PersonalCalibration, history: string[], label: string): number {
  if (!history.length) return 0
  const matches = calibration.temporalPatterns.filter(p => p.nextLabel === label && p.previousLabels.every((x, i) => history.slice(-p.previousLabels.length)[i] === x))
  if (!matches.length) return 0
  return Math.max(...matches.map(p => clamp01(p.confidence))) * 0.15
}

function priorBoost(calibration: PersonalCalibration, label: string): number {
  return clamp01(calibration.labelPrior[label] ?? 0) * 0.10
}

export function predictWithLearning(input: {
  predictionId: string
  profileId: string
  consent: ConsentScope
  mode: LearningMode
  window: FusionWindow
  candidateModels: Array<{ label: string; perSignalProbability: Partial<Record<PsiSignalKind, number>>; explanation?: string[] }>
  calibration: PersonalCalibration
  recentConfirmedLabels?: string[]
  localOnly?: boolean
}): LearningPrediction {
  const warnings: string[] = []
  const localOnly = input.localOnly ?? true
  if (!consentActive(input.consent)) warnings.push('Consent scope expired.')
  const disallowed = input.window.observations.filter(o => !input.consent.allowedSignals.includes(o.signalKind))
  if (disallowed.length) warnings.push(`Disallowed signal observations excluded: ${disallowed.map(o => o.id).join(', ')}`)
  const filteredWindow = {
    ...input.window,
    observations: input.window.observations.filter(o => input.consent.allowedSignals.includes(o.signalKind))
  }
  const baseAssessment = assessFusionWindow({ window: filteredWindow, candidateModels: input.candidateModels })
  const history = input.recentConfirmedLabels ?? []
  const personalizationApplied = input.consent.allowPersonalization && consentActive(input.consent)
  const temporalContextApplied = personalizationApplied && input.consent.allowTemporalLearning && history.length > 0

  const candidates = baseAssessment.candidates.map(candidate => {
    const boosted = personalizationApplied
      ? clamp01(candidate.probability + priorBoost(input.calibration, candidate.label) + (temporalContextApplied ? patternBoost(input.calibration, history, candidate.label) : 0))
      : candidate.probability
    const confidence: OracleConfidence = boosted >= 0.9 ? 'HIGH' : boosted >= 0.7 ? 'MEDIUM' : boosted >= 0.5 ? 'LOW' : 'UNASSESSED'
    return {
      ...candidate,
      probability: boosted,
      confidence,
      explanation: [
        ...candidate.explanation,
        personalizationApplied ? 'Personal calibration applied.' : 'Personal calibration not applied.',
        temporalContextApplied ? 'Temporal sequence context applied.' : 'Temporal sequence context not applied.'
      ]
    }
  }).sort((a, b) => b.probability - a.probability)

  return {
    id: input.predictionId,
    createdAt: new Date().toISOString(),
    baseAssessment,
    candidates,
    topCandidate: candidates[0],
    confidence: candidates[0]?.confidence ?? 'UNASSESSED',
    personalizationApplied,
    temporalContextApplied,
    audit: {
      profileId: input.profileId,
      consentId: input.consent.id,
      mode: input.mode,
      localOnly,
      historyLabels: history,
      warnings: [...baseAssessment.warnings, ...warnings]
    }
  }
}

export function applyFeedback(input: {
  calibration: PersonalCalibration
  feedback: IntentionFeedback
  recentLabels?: string[]
}): PersonalCalibration {
  const next: PersonalCalibration = {
    ...input.calibration,
    labelPrior: { ...input.calibration.labelPrior },
    signalReliability: { ...input.calibration.signalReliability },
    temporalPatterns: input.calibration.temporalPatterns.map(p => ({ ...p, previousLabels: [...p.previousLabels] })),
    sampleCount: input.calibration.sampleCount + 1,
    correctionCount: input.calibration.correctionCount + (input.feedback.kind === 'CORRECTED' ? 1 : 0),
    rejectedCount: input.calibration.rejectedCount + (input.feedback.kind === 'REJECTED' ? 1 : 0),
    lastUpdatedAt: input.feedback.timestamp
  }

  const actual = input.feedback.kind === 'CONFIRMED' ? input.feedback.predictedLabel : input.feedback.actualLabel
  if (actual) {
    const prior = next.labelPrior[actual] ?? 0
    next.labelPrior[actual] = clamp01(prior * 0.9 + 0.1)
    const history = input.recentLabels ?? []
    if (history.length) {
      const key = `${history.slice(-3).join('>')}=>${actual}`
      const existing = next.temporalPatterns.find(p => p.key === key)
      if (existing) {
        existing.count += 1
        existing.confidence = clamp01(existing.confidence + 0.05)
        existing.lastSeenAt = input.feedback.timestamp
      } else {
        next.temporalPatterns.push({ key, previousLabels: history.slice(-3), nextLabel: actual, count: 1, confidence: 0.55, lastSeenAt: input.feedback.timestamp })
      }
    }
  }
  return next
}

export function assessCalibrationDrift(input: {
  recentFeedback: IntentionFeedback[]
  baselineAccuracy: number
  minimumSamples?: number
  recalibrationDelta?: number
}): DriftAssessment {
  const minimumSamples = input.minimumSamples ?? 10
  const threshold = input.recalibrationDelta ?? 0.15
  const scored = input.recentFeedback.filter(f => f.kind !== 'SKIPPED')
  if (scored.length < minimumSamples) return { driftDetected: false, recentAccuracy: 0, baselineAccuracy: clamp01(input.baselineAccuracy), delta: 0, recommendation: 'NONE' }
  const correct = scored.filter(f => f.kind === 'CONFIRMED').length
  const recentAccuracy = correct / scored.length
  const baselineAccuracy = clamp01(input.baselineAccuracy)
  const delta = baselineAccuracy - recentAccuracy
  return {
    driftDetected: delta >= threshold,
    recentAccuracy,
    baselineAccuracy,
    delta,
    recommendation: delta >= threshold * 2 ? 'PAUSE_PERSONALIZATION' : delta >= threshold ? 'RECALIBRATE' : 'NONE'
  }
}

export function validateLearningObservation(observation: PsiObservation, consent: ConsentScope): string[] {
  const issues: string[] = []
  if (!consent.allowedSignals.includes(observation.signalKind)) issues.push(`Signal ${observation.signalKind} is outside consent scope.`)
  if (!observation.consentId && observation.signalKind !== 'CONTEXTUAL') issues.push('Sensitive observation lacks a consent identifier.')
  if (!consentActive(consent)) issues.push('Consent scope is expired.')
  return issues
}

export const neoIntentionLearningV1 = {
  id: 'NEO-INTENTION-LEARNING',
  version: '1.0.0',
  purpose: 'Adapt intention prediction to a consenting user through explicit feedback, temporal patterns, calibration, and drift detection without converting prediction into covert profiling.',
  principles: [
    'Personalization requires explicit consent.',
    'Feedback trains the model; silence does not count as agreement.',
    'Prefer local-only persistence for intimate behavioral and physiological calibration.',
    'Temporal patterns predict expression, not identity or hidden belief.',
    'Drift must trigger recalibration rather than false confidence.',
    'Users must be able to reject, correct, pause, and reset personalization.'
  ],
  defaultCalibration,
  predictWithLearning,
  applyFeedback,
  assessCalibrationDrift,
  validateLearningObservation
} as const
