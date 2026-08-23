import type { OracleConfidence } from './neoOraclePsitronics'
import type { SemanticThoughtForm, ThoughtMetricName, ThoughtMetricStatus, ThoughtMetricValue } from './neoSemanticThoughtForm'

export type DynamicsState = 'EMERGING' | 'STABLE' | 'EXPANDING' | 'CONTRACTING' | 'TRANSFORMING' | 'RECURRING' | 'DISSIPATING' | 'UNRESOLVED'
export type TrendDirection = 'UP' | 'DOWN' | 'FLAT' | 'OSCILLATING' | 'UNRESOLVED'

export type ThoughtFormSnapshot = {
  id: string
  capturedAt: string
  form: SemanticThoughtForm
  associations: string[]
  recurrenceKey?: string
}

export type MetricDelta = {
  metric: ThoughtMetricName
  from?: number | string
  to?: number | string
  numericDelta?: number
  trend: TrendDirection
  status: ThoughtMetricStatus
  notes: string[]
}

export type AssociationDelta = {
  added: string[]
  removed: string[]
  retained: string[]
}

export type EssenceTransition = {
  changed: boolean
  from?: string
  to?: string
  status: ThoughtMetricStatus
  confidence: OracleConfidence
  notes: string[]
}

export type RecurrenceAssessment = {
  key: string
  occurrences: number
  firstSeenAt: string
  lastSeenAt: string
  intervalSeconds?: number
  frequencyHz?: number
  status: 'MODEL_DERIVED' | 'MEASURED_PROXY' | 'UNRESOLVED'
  notes: string[]
}

export type ThoughtFormDynamicsAssessment = {
  id: string
  createdAt: string
  fromSnapshotId: string
  toSnapshotId: string
  elapsedSeconds: number
  state: DynamicsState
  metricDeltas: MetricDelta[]
  associations: AssociationDelta
  recurrence?: RecurrenceAssessment
  essence: EssenceTransition
  volumeTrend: TrendDirection
  intensityTrend: TrendDirection
  motionTrend: TrendDirection
  warnings: string[]
}

function metric(form: SemanticThoughtForm, name: ThoughtMetricName): ThoughtMetricValue | undefined {
  return form.metrics.find(m => m.name === name)
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function compareValues(from?: number | string, to?: number | string): { numericDelta?: number; trend: TrendDirection } {
  const a = toNumber(from)
  const b = toNumber(to)
  if (a !== undefined && b !== undefined) {
    const numericDelta = b - a
    return { numericDelta, trend: numericDelta > 0 ? 'UP' : numericDelta < 0 ? 'DOWN' : 'FLAT' }
  }
  if (from === undefined || to === undefined) return { trend: 'UNRESOLVED' }
  return { trend: from === to ? 'FLAT' : 'UNRESOLVED' }
}

function buildMetricDelta(fromForm: SemanticThoughtForm, toForm: SemanticThoughtForm, name: ThoughtMetricName): MetricDelta {
  const a = metric(fromForm, name)
  const b = metric(toForm, name)
  const compared = compareValues(a?.value, b?.value)
  const notes: string[] = []
  if (!a || !b) notes.push('Metric absent from one or both snapshots.')
  if ((a?.status === 'DOCTRINAL' || b?.status === 'DOCTRINAL') && compared.numericDelta !== undefined) {
    notes.push('Numeric change is a model comparison only; doctrinal values are not thereby physical measurements.')
  }
  return {
    metric: name,
    from: a?.value,
    to: b?.value,
    numericDelta: compared.numericDelta,
    trend: compared.trend,
    status: b?.status ?? a?.status ?? 'UNRESOLVED',
    notes
  }
}

function associationDelta(a: string[], b: string[]): AssociationDelta {
  const from = new Set(a)
  const to = new Set(b)
  return {
    added: [...to].filter(x => !from.has(x)),
    removed: [...from].filter(x => !to.has(x)),
    retained: [...to].filter(x => from.has(x))
  }
}

function confidenceForTransition(fromForm: SemanticThoughtForm, toForm: SemanticThoughtForm): OracleConfidence {
  const rank: Record<OracleConfidence, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNASSESSED: 0 }
  return rank[fromForm.confidence] <= rank[toForm.confidence] ? fromForm.confidence : toForm.confidence
}

function essenceTransition(fromForm: SemanticThoughtForm, toForm: SemanticThoughtForm): EssenceTransition {
  const a = metric(fromForm, 'ESSENCE')
  const b = metric(toForm, 'ESSENCE')
  const from = typeof a?.value === 'string' ? a.value : undefined
  const to = typeof b?.value === 'string' ? b.value : undefined
  return {
    changed: from !== undefined && to !== undefined ? from !== to : false,
    from,
    to,
    status: b?.status ?? a?.status ?? 'UNRESOLVED',
    confidence: confidenceForTransition(fromForm, toForm),
    notes: ['Essence transition describes a semantic/doctrinal state change unless independently tied to measured variables.']
  }
}

export function assessRecurrence(history: ThoughtFormSnapshot[], key: string): RecurrenceAssessment | undefined {
  const matches = history.filter(s => (s.recurrenceKey ?? s.form.semanticIntent) === key)
  if (matches.length < 2) return undefined
  const sorted = [...matches].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
  const first = new Date(sorted[0].capturedAt).getTime()
  const last = new Date(sorted[sorted.length - 1].capturedAt).getTime()
  const intervalSeconds = (last - first) / 1000 / (sorted.length - 1)
  const frequencyHz = intervalSeconds > 0 ? 1 / intervalSeconds : undefined
  return {
    key,
    occurrences: sorted.length,
    firstSeenAt: sorted[0].capturedAt,
    lastSeenAt: sorted[sorted.length - 1].capturedAt,
    intervalSeconds: Number.isFinite(intervalSeconds) ? intervalSeconds : undefined,
    frequencyHz,
    status: 'MODEL_DERIVED',
    notes: ['Recurrence frequency is derived from observed snapshot timing; it is not a claim about electromagnetic or neural oscillation frequency.']
  }
}

function deriveState(input: {
  volumeTrend: TrendDirection
  intensityTrend: TrendDirection
  essenceChanged: boolean
  recurrence?: RecurrenceAssessment
  elapsedSeconds: number
}): DynamicsState {
  if (input.essenceChanged) return 'TRANSFORMING'
  if (input.recurrence && input.recurrence.occurrences >= 3) return 'RECURRING'
  if (input.volumeTrend === 'UP' || input.intensityTrend === 'UP') return 'EXPANDING'
  if (input.volumeTrend === 'DOWN' || input.intensityTrend === 'DOWN') return 'CONTRACTING'
  if (input.volumeTrend === 'FLAT' && input.intensityTrend === 'FLAT') return 'STABLE'
  if (input.elapsedSeconds >= 0) return 'EMERGING'
  return 'UNRESOLVED'
}

export function assessThoughtFormDynamics(input: {
  from: ThoughtFormSnapshot
  to: ThoughtFormSnapshot
  history?: ThoughtFormSnapshot[]
}): ThoughtFormDynamicsAssessment {
  const warnings: string[] = []
  const elapsedSeconds = (new Date(input.to.capturedAt).getTime() - new Date(input.from.capturedAt).getTime()) / 1000
  if (elapsedSeconds < 0) warnings.push('Snapshot order is reversed in time.')

  const names: ThoughtMetricName[] = ['SHAPE','COLOR','WEIGHT','MOTION','DIRECTION','FREQUENCY','INTENSITY','DURATION','DEPTH','VOLUME','ESSENCE']
  const metricDeltas = names.map(name => buildMetricDelta(input.from.form, input.to.form, name))
  const volumeTrend = metricDeltas.find(d => d.metric === 'VOLUME')?.trend ?? 'UNRESOLVED'
  const intensityTrend = metricDeltas.find(d => d.metric === 'INTENSITY')?.trend ?? 'UNRESOLVED'
  const motionTrend = metricDeltas.find(d => d.metric === 'MOTION')?.trend ?? 'UNRESOLVED'
  const essence = essenceTransition(input.from.form, input.to.form)
  const recurrenceKey = input.to.recurrenceKey ?? input.to.form.semanticIntent
  const recurrence = assessRecurrence([...(input.history ?? []), input.from, input.to], recurrenceKey)

  return {
    id: `TFD-${input.from.id}-${input.to.id}`,
    createdAt: new Date().toISOString(),
    fromSnapshotId: input.from.id,
    toSnapshotId: input.to.id,
    elapsedSeconds,
    state: deriveState({ volumeTrend, intensityTrend, essenceChanged: essence.changed, recurrence, elapsedSeconds }),
    metricDeltas,
    associations: associationDelta(input.from.associations, input.to.associations),
    recurrence,
    essence,
    volumeTrend,
    intensityTrend,
    motionTrend,
    warnings
  }
}

export function buildThoughtFormTimeline(snapshots: ThoughtFormSnapshot[]): ThoughtFormDynamicsAssessment[] {
  const sorted = [...snapshots].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
  const out: ThoughtFormDynamicsAssessment[] = []
  for (let i = 1; i < sorted.length; i += 1) {
    out.push(assessThoughtFormDynamics({ from: sorted[i - 1], to: sorted[i], history: sorted.slice(0, i - 1) }))
  }
  return out
}

export function detectDynamicsCycle(assessments: ThoughtFormDynamicsAssessment[]): {
  cycleDetected: boolean
  repeatingStates: DynamicsState[]
  notes: string[]
} {
  const states = assessments.map(a => a.state)
  if (states.length < 4) return { cycleDetected: false, repeatingStates: [], notes: ['Insufficient state history for cycle detection.'] }
  for (let size = 1; size <= Math.floor(states.length / 2); size += 1) {
    const tail = states.slice(-size)
    const prior = states.slice(-(size * 2), -size)
    if (tail.length === prior.length && tail.every((x, i) => x === prior[i])) {
      return { cycleDetected: true, repeatingStates: tail, notes: ['Detected repeated dynamics-state sequence; this is a model pattern, not proof of a natural or metaphysical cycle.'] }
    }
  }
  return { cycleDetected: false, repeatingStates: [], notes: ['No repeated state sequence detected.'] }
}

export const neoThoughtFormDynamicsV1 = {
  id: 'NEO-THOUGHT-FORM-DYNAMICS',
  version: '1.0.0',
  purpose: 'Track how Noological semantic thought-forms change through time without conflating symbolic, doctrinal, model-derived, and physically measured quantities.',
  tracks: ['motion', 'direction', 'intensity', 'duration', 'recurrence', 'associations', 'depth', 'volume', 'essence-transition'],
  principles: [
    'Dynamics require at least two time-ordered snapshots.',
    'Recurrence frequency is temporal recurrence unless a physical signal frequency is explicitly measured.',
    'Volume expansion or contraction refers to the configured Noological/informational proxy unless geometric volume is explicitly supplied.',
    'Essence transition is semantic or doctrinal unless independently operationalized and measured.',
    'Cycles are detected as repeating model states and must not be promoted into metaphysical proof.',
    'Unresolved metrics remain unresolved.'
  ],
  assessRecurrence,
  assessThoughtFormDynamics,
  buildThoughtFormTimeline,
  detectDynamicsCycle
} as const
