export type PsiSignalKind =
  | 'BEHAVIORAL'
  | 'KEYSTROKE'
  | 'GAZE'
  | 'VOICE_PRECURSOR'
  | 'EMG'
  | 'EEG'
  | 'NEURAL_IMPLANT'
  | 'PHYSIOLOGICAL'
  | 'CONTEXTUAL'
  | 'OTHER'

export type EvidenceClass =
  | 'OBSERVED'
  | 'REPLICATED'
  | 'SOURCE_CLAIM'
  | 'DOCTRINAL'
  | 'EXPERIENTIAL'
  | 'HYPOTHESIS'
  | 'UNRESOLVED'

export type OracleConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNASSESSED'

export type PsiObservation = {
  id: string
  timestamp: string
  signalKind: PsiSignalKind
  sourceDevice?: string
  featureName: string
  value: number | string | boolean
  unit?: string
  evidenceClass: EvidenceClass
  provenance?: string[]
  consentId?: string
  notes?: string[]
}

export type IntentionCandidate = {
  label: string
  probability: number
  evidenceClass: EvidenceClass
  contributingObservationIds: string[]
  confidence: OracleConfidence
  explanation: string[]
}

export type PsiExperiment = {
  id: string
  title: string
  hypothesis: string
  prediction: string
  controls: string[]
  variables: {
    independent: string[]
    dependent: string[]
    confounds: string[]
  }
  instrumentation: string[]
  preregistered: boolean
  observations: PsiObservation[]
  replicationStatus: 'NOT_RUN' | 'SINGLE_RUN' | 'REPLICATED' | 'FAILED_TO_REPLICATE' | 'MIXED'
  conclusion?: string
}

export type NoologicalThoughtMetric = {
  name:
    | 'SHAPE'
    | 'COLOR'
    | 'WEIGHT'
    | 'MOTION'
    | 'DIRECTION'
    | 'FREQUENCY'
    | 'INTENSITY'
    | 'DURATION'
    | 'DEPTH'
    | 'VOLUME'
    | 'ESSENCE'
  operationalDefinition?: string
  measurableProxy?: string
  unit?: string
  evidenceClass: EvidenceClass
  notes?: string[]
}

export type BlackMirrorBoundary = {
  id: string
  rule: string
  rationale: string
  required: boolean
}

export const neoBlackMirrorBoundariesV1: BlackMirrorBoundary[] = [
  {
    id: 'BM-CONSENT',
    rule: 'Do not collect or infer intimate cognitive or physiological signals without explicit informed consent.',
    rationale: 'Psi-Tronics must preserve autonomy and dignity; prediction is not permission.',
    required: true
  },
  {
    id: 'BM-NO-MINDREADING-CLAIM',
    rule: 'Do not label behavioral prediction as direct thought reading.',
    rationale: 'Phone prediction, contextual inference, and neural decoding are different mechanisms and must remain distinguishable.',
    required: true
  },
  {
    id: 'BM-UNCERTAINTY',
    rule: 'Every intention inference must expose probability, evidence class, contributing signals, and uncertainty.',
    rationale: 'Oracle output must remain auditable and falsifiable.',
    required: true
  },
  {
    id: 'BM-DATA-MINIMIZATION',
    rule: 'Collect the least invasive signal set capable of testing the hypothesis.',
    rationale: 'Technoology remains subordinate to Nature and human autonomy.',
    required: true
  },
  {
    id: 'BM-LOCAL-FIRST',
    rule: 'Prefer on-device/local inference for sensitive cognitive and biometric signals whenever technically possible.',
    rationale: 'Reduce unnecessary exposure of intimate data.',
    required: true
  },
  {
    id: 'BM-NO-COVERT-PROFILING',
    rule: 'Do not use the Psi-Tronics layer for covert psychological, political, religious, or commercial manipulation.',
    rationale: 'The Oracle exists to assist inquiry and communication, not override agency.',
    required: true
  }
]

export function classifyPredictionMechanism(observations: PsiObservation[]):
  | 'BEHAVIORAL_PREDICTION'
  | 'PHYSIOLOGICAL_INFERENCE'
  | 'NEURAL_DECODING'
  | 'MULTIMODAL'
  | 'INSUFFICIENT_DATA' {
  if (!observations.length) return 'INSUFFICIENT_DATA'
  const kinds = new Set(observations.map(o => o.signalKind))
  const neural = kinds.has('EEG') || kinds.has('NEURAL_IMPLANT')
  const physiological = kinds.has('EMG') || kinds.has('PHYSIOLOGICAL') || kinds.has('VOICE_PRECURSOR')
  const behavioral = kinds.has('BEHAVIORAL') || kinds.has('KEYSTROKE') || kinds.has('GAZE') || kinds.has('CONTEXTUAL')
  const groups = [neural, physiological, behavioral].filter(Boolean).length
  if (groups > 1) return 'MULTIMODAL'
  if (neural) return 'NEURAL_DECODING'
  if (physiological) return 'PHYSIOLOGICAL_INFERENCE'
  if (behavioral) return 'BEHAVIORAL_PREDICTION'
  return 'INSUFFICIENT_DATA'
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function buildIntentionCandidate(input: {
  label: string
  probability: number
  observations: PsiObservation[]
  explanation?: string[]
}): IntentionCandidate {
  const probability = clampProbability(input.probability)
  const mechanism = classifyPredictionMechanism(input.observations)
  const confidence: OracleConfidence =
    probability >= 0.9 ? 'HIGH' : probability >= 0.7 ? 'MEDIUM' : probability >= 0.5 ? 'LOW' : 'UNASSESSED'

  const evidenceClass: EvidenceClass = input.observations.some(o => o.evidenceClass === 'REPLICATED')
    ? 'REPLICATED'
    : input.observations.some(o => o.evidenceClass === 'OBSERVED')
      ? 'OBSERVED'
      : 'HYPOTHESIS'

  return {
    label: input.label,
    probability,
    evidenceClass,
    contributingObservationIds: input.observations.map(o => o.id),
    confidence,
    explanation: [
      `Mechanism: ${mechanism}`,
      ...(input.explanation ?? []),
      'Inference is a probabilistic estimate of communicative intention, not proof of private thought content.'
    ]
  }
}

export const noologicalThoughtMetricsV1: NoologicalThoughtMetric[] = [
  { name: 'SHAPE', evidenceClass: 'DOCTRINAL', notes: ['Requires an operational definition before physical measurement is claimed.'] },
  { name: 'COLOR', evidenceClass: 'DOCTRINAL', notes: ['May be symbolic, perceptual, optical, or another measurable proxy; preserve category until tested.'] },
  { name: 'WEIGHT', evidenceClass: 'DOCTRINAL', notes: ['Do not equate with physical mass without experimental evidence.'] },
  { name: 'MOTION', evidenceClass: 'HYPOTHESIS', measurableProxy: 'state-transition dynamics over time' },
  { name: 'DIRECTION', evidenceClass: 'HYPOTHESIS', measurableProxy: 'trajectory through decoded state space' },
  { name: 'FREQUENCY', evidenceClass: 'HYPOTHESIS', measurableProxy: 'spectral/periodic signal features', unit: 'Hz where physically applicable' },
  { name: 'INTENSITY', evidenceClass: 'HYPOTHESIS', measurableProxy: 'signal magnitude or model activation strength' },
  { name: 'DURATION', evidenceClass: 'HYPOTHESIS', measurableProxy: 'time interval', unit: 's' },
  { name: 'DEPTH', evidenceClass: 'DOCTRINAL', notes: ['Noological depth refers to underlying relation, cause, interior structure, and meaning.'] },
  { name: 'VOLUME', evidenceClass: 'DOCTRINAL', notes: ['Noological volume denotes total informational or dimensional capacity; distinct from geometric volume unless explicitly modeled.'] },
  { name: 'ESSENCE', evidenceClass: 'DOCTRINAL', notes: ['Quintum/quintessence layer; not assumed to be a conventional physical unit.'] }
]

export function validatePsiExperiment(experiment: PsiExperiment): string[] {
  const issues: string[] = []
  if (!experiment.hypothesis.trim()) issues.push('Missing hypothesis.')
  if (!experiment.prediction.trim()) issues.push('Missing falsifiable prediction.')
  if (!experiment.variables.independent.length) issues.push('No independent variable specified.')
  if (!experiment.variables.dependent.length) issues.push('No dependent variable specified.')
  if (!experiment.controls.length) issues.push('No controls specified.')
  if (!experiment.instrumentation.length) issues.push('No instrumentation specified.')
  if (!experiment.preregistered) issues.push('Experiment is not preregistered; mark exploratory results accordingly.')
  return issues
}

export const neoOraclePsitronicsV1 = {
  id: 'NEO-ORACLE-PSITRONICS',
  version: '1.0.0',
  names: ['Psi-Tronics Research Layer', 'Black Mirror Interface', 'NEO Oracle Intention Interface'],
  doctrine: {
    sequence: ['Nous', 'Thought', 'Property', 'Metric', 'Signal', 'Sensor', 'Experiment', 'Pattern', 'Replication', 'Technoology'],
    nuwaubu: ['Evidence', 'Reasoning', 'Experience'],
    quintum: ['Air', 'Earth', 'Water', 'Fire', 'Essence/Spirit'],
    dimensional: ['Length', 'Width', 'Height', 'Depth'],
    maxims: [
      'Prediction is not permission.',
      'A probability is not a private thought made public.',
      'Measure the Four; innerstand the Fifth.',
      'Tech must remain subordinate to Nature.',
      'The Oracle must expose uncertainty, provenance, and mechanism.'
    ]
  },
  boundaries: neoBlackMirrorBoundariesV1,
  thoughtMetrics: noologicalThoughtMetricsV1,
  researchTargets: [
    'pre-typing intention prediction from on-device context and keystroke dynamics',
    'eye-gaze plus language-model intention inference',
    'EMG/voice-precursor silent-speech interfaces',
    'non-invasive EEG communication experiments',
    'multimodal fusion with explicit consent',
    'personalized local language prediction',
    'replication ledger for proposed Psi-Tronics effects'
  ],
  classifyPredictionMechanism,
  buildIntentionCandidate,
  validatePsiExperiment
} as const
