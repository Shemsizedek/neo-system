import type { OracleConfidence } from './neoOraclePsitronics'
import type { SemanticThoughtForm, ThoughtMetricName, ThoughtMetricStatus } from './neoSemanticThoughtForm'
import type { ThoughtFormSnapshot } from './neoThoughtFormDynamics'

export type InteractionMode = 'ATTRACT' | 'REINFORCE' | 'OPPOSE' | 'MERGE' | 'BRANCH' | 'NEUTRALIZE' | 'TRANSFORM' | 'COEXIST' | 'UNRESOLVED'
export type RelationPolarity = 'AGREEABLE' | 'DISAGREEABLE' | 'MIXED' | 'NEUTRAL' | 'UNRESOLVED'

export type InteractionNode = {
  id: string
  snapshot: ThoughtFormSnapshot
  weight?: number
}

export type MetricRelation = {
  metric: ThoughtMetricName
  left?: number | string
  right?: number | string
  similarity?: number
  status: ThoughtMetricStatus
  notes: string[]
}

export type InteractionEdge = {
  id: string
  fromNodeId: string
  toNodeId: string
  mode: InteractionMode
  polarity: RelationPolarity
  strength: number
  confidence: OracleConfidence
  sharedAssociations: string[]
  competingAssociations: string[]
  metricRelations: MetricRelation[]
  provenance: string[]
  notes: string[]
}

export type InteractionField = {
  id: string
  createdAt: string
  nodes: InteractionNode[]
  edges: InteractionEdge[]
  dominantMode: InteractionMode
  dominantPolarity: RelationPolarity
  coherence: number
  tension: number
  emergentConcepts: string[]
  warnings: string[]
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function metricValue(form: SemanticThoughtForm, name: ThoughtMetricName): number | string | undefined {
  return form.metrics.find(m => m.name === name)?.value
}

function metricStatus(form: SemanticThoughtForm, name: ThoughtMetricName): ThoughtMetricStatus {
  return form.metrics.find(m => m.name === name)?.status ?? 'UNRESOLVED'
}

function numericSimilarity(a: number, b: number): number {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1)
  return clamp01(1 - Math.abs(a - b) / scale)
}

function relationForMetric(left: SemanticThoughtForm, right: SemanticThoughtForm, name: ThoughtMetricName): MetricRelation {
  const a = metricValue(left, name)
  const b = metricValue(right, name)
  let similarity: number | undefined
  if (typeof a === 'number' && typeof b === 'number') similarity = numericSimilarity(a, b)
  else if (typeof a === 'string' && typeof b === 'string') similarity = a === b ? 1 : 0
  return {
    metric: name,
    left: a,
    right: b,
    similarity,
    status: metricStatus(right, name) !== 'UNRESOLVED' ? metricStatus(right, name) : metricStatus(left, name),
    notes: ['Similarity compares model representations only; it does not establish a physical force or field.']
  }
}

function setOverlap(a: string[], b: string[]): { shared: string[]; competing: string[]; score: number } {
  const left = new Set(a)
  const right = new Set(b)
  const shared = [...left].filter(x => right.has(x))
  const competing = [...new Set([...a, ...b])].filter(x => !(left.has(x) && right.has(x)))
  const union = new Set([...a, ...b]).size
  return { shared, competing, score: union ? shared.length / union : 0 }
}

function confidenceFromStrength(strength: number): OracleConfidence {
  return strength >= 0.85 ? 'HIGH' : strength >= 0.65 ? 'MEDIUM' : strength >= 0.45 ? 'LOW' : 'UNASSESSED'
}

function deriveMode(input: { semanticSame: boolean; essenceSame: boolean; associationScore: number; intensitySimilarity?: number }): InteractionMode {
  if (input.semanticSame && input.essenceSame && input.associationScore >= 0.5) return 'REINFORCE'
  if (input.semanticSame && !input.essenceSame) return 'TRANSFORM'
  if (!input.semanticSame && input.associationScore >= 0.6) return 'MERGE'
  if (!input.semanticSame && input.associationScore <= 0.1 && (input.intensitySimilarity ?? 0) <= 0.2) return 'OPPOSE'
  if (input.associationScore > 0.2) return 'ATTRACT'
  return 'COEXIST'
}

function derivePolarity(mode: InteractionMode): RelationPolarity {
  if (mode === 'REINFORCE' || mode === 'MERGE' || mode === 'ATTRACT') return 'AGREEABLE'
  if (mode === 'OPPOSE' || mode === 'NEUTRALIZE') return 'DISAGREEABLE'
  if (mode === 'TRANSFORM' || mode === 'BRANCH') return 'MIXED'
  if (mode === 'COEXIST') return 'NEUTRAL'
  return 'UNRESOLVED'
}

export function assessThoughtFormInteraction(left: InteractionNode, right: InteractionNode): InteractionEdge {
  const names: ThoughtMetricName[] = ['SHAPE','COLOR','WEIGHT','MOTION','DIRECTION','FREQUENCY','INTENSITY','DURATION','DEPTH','VOLUME','ESSENCE']
  const metricRelations = names.map(name => relationForMetric(left.snapshot.form, right.snapshot.form, name))
  const overlap = setOverlap(left.snapshot.associations, right.snapshot.associations)
  const semanticSame = left.snapshot.form.semanticIntent === right.snapshot.form.semanticIntent
  const essenceLeft = metricValue(left.snapshot.form, 'ESSENCE')
  const essenceRight = metricValue(right.snapshot.form, 'ESSENCE')
  const essenceSame = essenceLeft !== undefined && essenceRight !== undefined && essenceLeft === essenceRight
  const intensitySimilarity = metricRelations.find(r => r.metric === 'INTENSITY')?.similarity
  const mode = deriveMode({ semanticSame, essenceSame, associationScore: overlap.score, intensitySimilarity })
  const comparable = metricRelations.filter(r => typeof r.similarity === 'number')
  const metricScore = comparable.length ? comparable.reduce((n, r) => n + (r.similarity ?? 0), 0) / comparable.length : 0
  const strength = clamp01(metricScore * 0.5 + overlap.score * 0.35 + (semanticSame ? 0.15 : 0))

  return {
    id: `TFI-${left.id}-${right.id}`,
    fromNodeId: left.id,
    toNodeId: right.id,
    mode,
    polarity: derivePolarity(mode),
    strength,
    confidence: confidenceFromStrength(strength),
    sharedAssociations: overlap.shared,
    competingAssociations: overlap.competing,
    metricRelations,
    provenance: [left.snapshot.id, right.snapshot.id, left.snapshot.form.id, right.snapshot.form.id],
    notes: [
      'Interaction mode is a NEO model classification of semantic relations, not evidence of a literal physical force between thoughts.',
      'Agreeable/disagreeable polarity is relational terminology and must remain distinct from electrical charge or other measured physical polarity.'
    ]
  }
}

function modeCount(edges: InteractionEdge[]): Map<InteractionMode, number> {
  const out = new Map<InteractionMode, number>()
  for (const edge of edges) out.set(edge.mode, (out.get(edge.mode) ?? 0) + 1)
  return out
}

function polarityCount(edges: InteractionEdge[]): Map<RelationPolarity, number> {
  const out = new Map<RelationPolarity, number>()
  for (const edge of edges) out.set(edge.polarity, (out.get(edge.polarity) ?? 0) + 1)
  return out
}

function topKey<T extends string>(map: Map<T, number>, fallback: T): T {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback
}

export function buildThoughtFormInteractionField(input: { id: string; nodes: InteractionNode[] }): InteractionField {
  const warnings: string[] = []
  const edges: InteractionEdge[] = []
  for (let i = 0; i < input.nodes.length; i += 1) {
    for (let j = i + 1; j < input.nodes.length; j += 1) edges.push(assessThoughtFormInteraction(input.nodes[i], input.nodes[j]))
  }
  if (input.nodes.length < 2) warnings.push('At least two thought-form nodes are required for interaction analysis.')

  const agreeable = edges.filter(e => e.polarity === 'AGREEABLE').reduce((n, e) => n + e.strength, 0)
  const disagreeable = edges.filter(e => e.polarity === 'DISAGREEABLE').reduce((n, e) => n + e.strength, 0)
  const total = edges.reduce((n, e) => n + e.strength, 0)
  const coherence = total ? clamp01(agreeable / total) : 0
  const tension = total ? clamp01(disagreeable / total) : 0

  const associationCounts = new Map<string, number>()
  for (const node of input.nodes) for (const item of node.snapshot.associations) associationCounts.set(item, (associationCounts.get(item) ?? 0) + 1)
  const emergentConcepts = [...associationCounts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).map(([name]) => name)

  return {
    id: input.id,
    createdAt: new Date().toISOString(),
    nodes: input.nodes,
    edges,
    dominantMode: topKey(modeCount(edges), 'UNRESOLVED'),
    dominantPolarity: topKey(polarityCount(edges), 'UNRESOLVED'),
    coherence,
    tension,
    emergentConcepts,
    warnings
  }
}

export function validateThoughtFormInteractionField(field: InteractionField): string[] {
  const issues = [...field.warnings]
  if (field.edges.some(e => e.strength < 0 || e.strength > 1)) issues.push('Interaction strength outside normalized range.')
  if (field.coherence + field.tension > 1.000001) issues.push('Field coherence and tension exceed normalized bounds.')
  if (field.edges.some(e => !e.provenance.length)) issues.push('One or more interaction edges lack provenance.')
  return issues
}

export const neoThoughtFormInteractionV1 = {
  id: 'NEO-THOUGHT-FORM-INTERACTION',
  version: '1.0.0',
  purpose: 'Model how two or more semantic thought-forms relate, reinforce, oppose, merge, branch, neutralize, transform, or coexist while preserving provenance and epistemic boundaries.',
  modes: ['ATTRACT','REINFORCE','OPPOSE','MERGE','BRANCH','NEUTRALIZE','TRANSFORM','COEXIST','UNRESOLVED'],
  principles: [
    'Interaction classifications are semantic and Noological model relations unless separately measured as physical effects.',
    'No modeled attraction, opposition, polarity, field, or force is automatically a claim of electromagnetism or another physical interaction.',
    'Every edge retains the source thought-forms and snapshots that produced it.',
    'Shared associations increase modeled coherence; disagreement may increase modeled tension, but neither score is metaphysical proof.',
    'Emergent concepts require repeated support across nodes and remain model-derived until independently evidenced.',
    'Unresolved relations remain unresolved.'
  ],
  assessThoughtFormInteraction,
  buildThoughtFormInteractionField,
  validateThoughtFormInteractionField
} as const
