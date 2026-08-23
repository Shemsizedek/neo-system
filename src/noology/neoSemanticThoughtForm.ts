import type { OracleConfidence } from './neoOraclePsitronics'
import type { ExpressionCandidate, ExpressionPrediction } from './neoPreExpressionLanguage'

export type ThoughtMetricName =
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

export type ThoughtMetricStatus =
  | 'DOCTRINAL'
  | 'SYMBOLIC'
  | 'EXPERIENTIAL'
  | 'MODEL_DERIVED'
  | 'MEASURED_PROXY'
  | 'UNRESOLVED'

export type ThoughtMetricValue = {
  name: ThoughtMetricName
  status: ThoughtMetricStatus
  value?: number | string
  unit?: string
  confidence: OracleConfidence
  operationalDefinition: string
  provenance: string[]
  notes: string[]
}

export type SemanticThoughtForm = {
  id: string
  createdAt: string
  expressionCandidateId: string
  surface: string
  semanticIntent: string
  language: ExpressionCandidate['language']
  probability: number
  confidence: OracleConfidence
  dimensions: {
    length?: ThoughtMetricValue
    width?: ThoughtMetricValue
    height?: ThoughtMetricValue
    depth: ThoughtMetricValue
  }
  quintum: {
    air: ThoughtMetricValue
    earth: ThoughtMetricValue
    water: ThoughtMetricValue
    fire: ThoughtMetricValue
    essence: ThoughtMetricValue
  }
  metrics: ThoughtMetricValue[]
  audit: {
    doctrinalCount: number
    measuredProxyCount: number
    unresolvedCount: number
    warnings: string[]
  }
}

export type ThoughtFormOverrides = Partial<Record<ThoughtMetricName, Omit<ThoughtMetricValue, 'name'>>>

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function confidenceFromProbability(probability: number): OracleConfidence {
  return probability >= 0.9 ? 'HIGH' : probability >= 0.7 ? 'MEDIUM' : probability >= 0.5 ? 'LOW' : 'UNASSESSED'
}

function baseMetric(name: ThoughtMetricName, candidate: ExpressionCandidate): ThoughtMetricValue {
  const shared = {
    name,
    confidence: candidate.confidence,
    provenance: [candidate.id, ...candidate.sourceLexemeIds],
    notes: ['Default value is a NEO semantic/doctrinal representation, not a physical measurement.']
  }

  switch (name) {
    case 'SHAPE':
      return { ...shared, status: 'SYMBOLIC', value: candidate.unit, operationalDefinition: 'Representational form assigned to the predicted concept or expression.' }
    case 'COLOR':
      return { ...shared, status: 'UNRESOLVED', operationalDefinition: 'Color correspondence remains unset until supplied by doctrine, source, user experience, or a measured optical proxy.' }
    case 'WEIGHT':
      return { ...shared, status: 'UNRESOLVED', operationalDefinition: 'Noological weight denotes relative cognitive or semantic gravity; do not equate with physical mass without measurement.' }
    case 'MOTION':
      return { ...shared, status: 'MODEL_DERIVED', value: 'STATE_TRANSITION', operationalDefinition: 'Change in semantic/intention state over time.' }
    case 'DIRECTION':
      return { ...shared, status: 'MODEL_DERIVED', value: 'TOWARD_EXPRESSION', operationalDefinition: 'Trajectory from semantic intention toward candidate expression.' }
    case 'FREQUENCY':
      return { ...shared, status: 'UNRESOLVED', operationalDefinition: 'Frequency may refer to recurrence rate or a measured signal spectrum; these meanings must remain distinct.' }
    case 'INTENSITY':
      return { ...shared, status: 'MODEL_DERIVED', value: clamp01(candidate.probability), unit: 'probability', operationalDefinition: 'Current model strength for the candidate; not equivalent to a physical energy value.' }
    case 'DURATION':
      return { ...shared, status: 'UNRESOLVED', operationalDefinition: 'Duration requires temporal observations or user/source annotation.' }
    case 'DEPTH':
      return { ...shared, status: 'DOCTRINAL', value: candidate.explanation.length, unit: 'relation-count-proxy', operationalDefinition: 'Noological depth represents underlying relation, cause, interior structure, and meaning; relation count is only a computational proxy.' }
    case 'VOLUME':
      return { ...shared, status: 'MODEL_DERIVED', value: candidate.supportingIntentionLabels.length + candidate.sourceLexemeIds.length, unit: 'support-count-proxy', operationalDefinition: 'Noological volume denotes the informational capacity/support surrounding the thought-form; distinct from geometric volume.' }
    case 'ESSENCE':
      return { ...shared, status: 'DOCTRINAL', value: candidate.semanticIntent, operationalDefinition: 'Quintum/quintessence representation: the integrating semantic essence assigned to the thought-form.' }
  }
}

function mergeMetric(base: ThoughtMetricValue, override?: Omit<ThoughtMetricValue, 'name'>): ThoughtMetricValue {
  return override ? { name: base.name, ...override } : base
}

function elementMetric(
  element: 'AIR' | 'EARTH' | 'WATER' | 'FIRE' | 'ESSENCE',
  candidate: ExpressionCandidate
): ThoughtMetricValue {
  const map = {
    AIR: { name: 'MOTION' as const, value: 'communication/breath/transfer', definition: 'Air correspondence for movement, transmission, and communicative flow.' },
    EARTH: { name: 'WEIGHT' as const, value: 'form/stability', definition: 'Earth correspondence for embodied form, stability, and grounding.' },
    WATER: { name: 'DIRECTION' as const, value: 'flow/adaptation', definition: 'Water correspondence for flow, relation, and adaptive transition.' },
    FIRE: { name: 'INTENSITY' as const, value: clamp01(candidate.probability), definition: 'Fire correspondence for activation, intensity, and transformation.' },
    ESSENCE: { name: 'ESSENCE' as const, value: candidate.semanticIntent, definition: 'Spirit/Essence as the integrating fifth principle or quintessence.' }
  }[element]

  return {
    name: map.name,
    status: 'DOCTRINAL',
    value: map.value,
    confidence: candidate.confidence,
    operationalDefinition: map.definition,
    provenance: [candidate.id],
    notes: ['Elemental correspondence is doctrinal unless separately tied to measured variables.']
  }
}

export function buildSemanticThoughtForm(input: {
  candidate: ExpressionCandidate
  overrides?: ThoughtFormOverrides
}): SemanticThoughtForm {
  const names: ThoughtMetricName[] = ['SHAPE','COLOR','WEIGHT','MOTION','DIRECTION','FREQUENCY','INTENSITY','DURATION','DEPTH','VOLUME','ESSENCE']
  const metrics = names.map(name => mergeMetric(baseMetric(name, input.candidate), input.overrides?.[name]))
  const byName = new Map(metrics.map(metric => [metric.name, metric]))
  const warnings: string[] = []

  if (metrics.some(m => m.status === 'MEASURED_PROXY' && !m.unit)) warnings.push('One or more measured proxies lack a unit.')
  if (metrics.some(m => m.status === 'UNRESOLVED')) warnings.push('Thought-form contains unresolved metrics; do not infer missing values.')

  return {
    id: `TF-${input.candidate.id}`,
    createdAt: new Date().toISOString(),
    expressionCandidateId: input.candidate.id,
    surface: input.candidate.surface,
    semanticIntent: input.candidate.semanticIntent,
    language: input.candidate.language,
    probability: input.candidate.probability,
    confidence: confidenceFromProbability(input.candidate.probability),
    dimensions: {
      depth: byName.get('DEPTH')!
    },
    quintum: {
      air: elementMetric('AIR', input.candidate),
      earth: elementMetric('EARTH', input.candidate),
      water: elementMetric('WATER', input.candidate),
      fire: elementMetric('FIRE', input.candidate),
      essence: elementMetric('ESSENCE', input.candidate)
    },
    metrics,
    audit: {
      doctrinalCount: metrics.filter(m => m.status === 'DOCTRINAL').length,
      measuredProxyCount: metrics.filter(m => m.status === 'MEASURED_PROXY').length,
      unresolvedCount: metrics.filter(m => m.status === 'UNRESOLVED').length,
      warnings
    }
  }
}

export function buildThoughtFormsFromPrediction(input: {
  prediction: ExpressionPrediction
  maxForms?: number
  overridesByCandidateId?: Record<string, ThoughtFormOverrides>
}): SemanticThoughtForm[] {
  return input.prediction.candidates
    .slice(0, input.maxForms ?? 5)
    .map(candidate => buildSemanticThoughtForm({
      candidate,
      overrides: input.overridesByCandidateId?.[candidate.id]
    }))
}

export function validateThoughtForm(form: SemanticThoughtForm): string[] {
  const issues = [...form.audit.warnings]
  for (const metric of form.metrics) {
    if (metric.status === 'MEASURED_PROXY' && typeof metric.value !== 'number') {
      issues.push(`${metric.name} is marked MEASURED_PROXY without a numeric value.`)
    }
    if (metric.status === 'MEASURED_PROXY' && !metric.provenance.length) {
      issues.push(`${metric.name} measured proxy lacks provenance.`)
    }
  }
  return issues
}

export const neoSemanticThoughtFormV1 = {
  id: 'NEO-SEMANTIC-THOUGHT-FORM',
  version: '1.0.0',
  purpose: 'Represent predicted communicative concepts as auditable Noological thought-forms while preserving the boundary between doctrine, symbolism, model-derived proxies, experience, and physical measurement.',
  dimensionalModel: ['Length', 'Width', 'Height', 'Depth'],
  quintumModel: ['Air', 'Earth', 'Water', 'Fire', 'Essence/Spirit'],
  metrics: ['Shape','Color','Weight','Motion','Direction','Frequency','Intensity','Duration','Depth','Volume','Essence'],
  principles: [
    'Representation is not measurement.',
    'A doctrinal correspondence must not be silently relabeled as a physical quantity.',
    'Measured proxies require units, provenance, and reproducible instrumentation.',
    'Unresolved metrics remain unresolved rather than being fabricated.',
    'Depth concerns underlying relations and meaning; Volume concerns informational capacity; Essence is the integrating Quintum principle.',
    'Thought-form output describes the model of likely expression, not ownership or direct access to private thought.'
  ],
  buildSemanticThoughtForm,
  buildThoughtFormsFromPrediction,
  validateThoughtForm
} as const
