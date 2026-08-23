import type { IntentionCandidate, OracleConfidence } from './neoOraclePsitronics'
import type { LearningPrediction, IntentionFeedback } from './neoIntentionLearning'
import { nuwaubicCoreLexiconV1, type Lexeme } from './nuwaubicCommunicationProtocol'

export type ExpressionLanguage = 'ENGLISH' | 'NUWAUBIC' | 'NUWAUPIC' | 'MIXED'
export type ExpressionUnit = 'CONCEPT' | 'WORD' | 'PHRASE' | 'SENTENCE'
export type CandidateStatus = 'SOURCE_ATTESTED' | 'USER_ATTESTED' | 'MODEL_DERIVED' | 'PROVISIONAL' | 'UNRESOLVED'

export type PreExpressionContext = {
  id: string
  createdAt: string
  profileId: string
  consentId: string
  language: ExpressionLanguage
  partialText?: string
  confirmedHistory: string[]
  activeConcepts?: string[]
  localOnly: boolean
  allowPersonalization: boolean
}

export type ExpressionCandidate = {
  id: string
  unit: ExpressionUnit
  language: ExpressionLanguage
  surface: string
  normalized: string
  semanticIntent: string
  probability: number
  confidence: OracleConfidence
  status: CandidateStatus
  sourceLexemeIds: string[]
  supportingIntentionLabels: string[]
  explanation: string[]
}

export type ExpressionPrediction = {
  id: string
  createdAt: string
  contextId: string
  candidates: ExpressionCandidate[]
  topCandidate?: ExpressionCandidate
  audit: {
    profileId: string
    consentId: string
    localOnly: boolean
    language: ExpressionLanguage
    sourceBound: boolean
    warnings: string[]
  }
}

export type ExpressionFeedback = {
  id: string
  predictionId: string
  candidateId?: string
  kind: 'ACCEPTED' | 'CORRECTED' | 'REJECTED' | 'IGNORED'
  predictedSurface?: string
  actualSurface?: string
  language: ExpressionLanguage
  timestamp: string
  consentId: string
}

export type ExpressionMemory = {
  profileId: string
  acceptedForms: Record<string, number>
  correctedForms: Record<string, string>
  rejectedForms: Record<string, number>
  semanticAssociations: Record<string, Record<string, number>>
  lastUpdatedAt: string
}

export const defaultExpressionMemory = (profileId: string, at = new Date().toISOString()): ExpressionMemory => ({
  profileId,
  acceptedForms: {},
  correctedForms: {},
  rejectedForms: {},
  semanticAssociations: {},
  lastUpdatedAt: at
})

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function confidenceFromProbability(probability: number): OracleConfidence {
  return probability >= 0.9 ? 'HIGH' : probability >= 0.7 ? 'MEDIUM' : probability >= 0.5 ? 'LOW' : 'UNASSESSED'
}

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}

function lexemeMatchesPartial(partial: string): Lexeme[] {
  const n = normalize(partial)
  if (!n) return []
  const parts = n.split(' ')
  const last = parts.length ? parts[parts.length - 1] : ''
  return nuwaubicCoreLexiconV1.filter(x =>
    normalize(x.nuwaubic).startsWith(last) || x.english.some(e => normalize(e).startsWith(last)))
}

function sourceCandidateFromLexeme(lexeme: Lexeme, intention: IntentionCandidate, language: ExpressionLanguage, boost = 0): ExpressionCandidate {
  const surface = language === 'NUWAUBIC' || language === 'NUWAUPIC' ? lexeme.nuwaubic : lexeme.english[0]
  const probability = clamp01(intention.probability * 0.75 + boost)
  return {
    id: `EXP-${intention.label}-${lexeme.id}`,
    unit: 'WORD',
    language,
    surface,
    normalized: normalize(surface),
    semanticIntent: intention.label,
    probability,
    confidence: confidenceFromProbability(probability),
    status: lexeme.sourceStatus === 'SOURCE_ATTESTED' ? 'SOURCE_ATTESTED' : 'MODEL_DERIVED',
    sourceLexemeIds: [lexeme.id],
    supportingIntentionLabels: [intention.label],
    explanation: [
      `Expression candidate grounded in lexeme ${lexeme.id}.`,
      `Supporting intention probability: ${intention.probability.toFixed(3)}.`,
      'Candidate predicts likely communicative expression, not unexpressed private belief.'
    ]
  }
}

export function generatePreExpressionCandidates(input: {
  prediction: LearningPrediction
  context: PreExpressionContext
  memory?: ExpressionMemory
  maxCandidates?: number
}): ExpressionPrediction {
  const warnings: string[] = []
  const memory = input.memory ?? defaultExpressionMemory(input.context.profileId)
  const maxCandidates = input.maxCandidates ?? 8
  const candidates: ExpressionCandidate[] = []
  const partialMatches = lexemeMatchesPartial(input.context.partialText ?? '')

  if (!input.context.localOnly) warnings.push('Pre-expression context is not configured local-only.')
  if (!input.context.allowPersonalization && input.memory) warnings.push('Expression memory supplied while personalization is disabled; memory boosts were not applied.')

  for (const intention of input.prediction.candidates) {
    const normalizedLabel = normalize(intention.label)
    const directLexemes = nuwaubicCoreLexiconV1.filter(lexeme =>
      lexeme.english.some(e => normalize(e) === normalizedLabel) || normalize(lexeme.nuwaubic) === normalizedLabel)
    const lexemes = [...directLexemes, ...partialMatches]
      .filter((item, index, all) => all.findIndex(x => x.id === item.id) === index)

    for (const lexeme of lexemes) {
      const surface = input.context.language === 'NUWAUBIC' || input.context.language === 'NUWAUPIC' ? lexeme.nuwaubic : lexeme.english[0]
      const accepted = input.context.allowPersonalization ? (memory.acceptedForms[normalize(surface)] ?? 0) : 0
      const rejected = input.context.allowPersonalization ? (memory.rejectedForms[normalize(surface)] ?? 0) : 0
      const boost = Math.min(0.15, accepted * 0.02) - Math.min(0.20, rejected * 0.03)
      candidates.push(sourceCandidateFromLexeme(lexeme, intention, input.context.language, boost))
    }

    if (!lexemes.length && intention.probability >= 0.5) {
      candidates.push({
        id: `EXP-${intention.label}-CONCEPT`,
        unit: 'CONCEPT',
        language: input.context.language,
        surface: intention.label,
        normalized: normalizedLabel,
        semanticIntent: intention.label,
        probability: clamp01(intention.probability * 0.65),
        confidence: confidenceFromProbability(intention.probability * 0.65),
        status: 'UNRESOLVED',
        sourceLexemeIds: [],
        supportingIntentionLabels: [intention.label],
        explanation: [
          'Semantic intention is available, but no source-attested Nuwaubic/Nuwaupic lexical form is registered.',
          'Do not fabricate a language form; route to lexicon review or preserve the concept label.'
        ]
      })
    }
  }

  const unique = candidates
    .filter((c, i, all) => all.findIndex(x => x.language === c.language && x.normalized === c.normalized && x.semanticIntent === c.semanticIntent) === i)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, maxCandidates)

  return {
    id: `PRE-${input.prediction.id}`,
    createdAt: new Date().toISOString(),
    contextId: input.context.id,
    candidates: unique,
    topCandidate: unique[0],
    audit: {
      profileId: input.context.profileId,
      consentId: input.context.consentId,
      localOnly: input.context.localOnly,
      language: input.context.language,
      sourceBound: unique.every(c => c.status !== 'PROVISIONAL'),
      warnings: [...input.prediction.audit.warnings, ...warnings]
    }
  }
}

export function applyExpressionFeedback(input: {
  memory: ExpressionMemory
  feedback: ExpressionFeedback
  semanticIntent?: string
}): ExpressionMemory {
  const next: ExpressionMemory = {
    ...input.memory,
    acceptedForms: { ...input.memory.acceptedForms },
    correctedForms: { ...input.memory.correctedForms },
    rejectedForms: { ...input.memory.rejectedForms },
    semanticAssociations: Object.fromEntries(Object.entries(input.memory.semanticAssociations).map(([k, v]) => [k, { ...v }])),
    lastUpdatedAt: input.feedback.timestamp
  }

  const predicted = normalize(input.feedback.predictedSurface ?? '')
  const actual = normalize(input.feedback.actualSurface ?? '')
  if (input.feedback.kind === 'ACCEPTED' && predicted) next.acceptedForms[predicted] = (next.acceptedForms[predicted] ?? 0) + 1
  if (input.feedback.kind === 'REJECTED' && predicted) next.rejectedForms[predicted] = (next.rejectedForms[predicted] ?? 0) + 1
  if (input.feedback.kind === 'CORRECTED' && predicted && actual) {
    next.correctedForms[predicted] = actual
    next.acceptedForms[actual] = (next.acceptedForms[actual] ?? 0) + 1
  }
  if (input.semanticIntent && actual) {
    const key = normalize(input.semanticIntent)
    next.semanticAssociations[key] = { ...(next.semanticAssociations[key] ?? {}) }
    next.semanticAssociations[key][actual] = (next.semanticAssociations[key][actual] ?? 0) + 1
  }
  return next
}

export function bridgeIntentionFeedback(feedback: ExpressionFeedback): IntentionFeedback {
  return {
    id: `INT-${feedback.id}`,
    predictionId: feedback.predictionId,
    kind: feedback.kind === 'ACCEPTED' ? 'CONFIRMED' : feedback.kind === 'CORRECTED' ? 'CORRECTED' : feedback.kind === 'REJECTED' ? 'REJECTED' : 'SKIPPED',
    predictedLabel: feedback.predictedSurface ?? '',
    actualLabel: feedback.actualSurface,
    timestamp: feedback.timestamp,
    consentId: feedback.consentId,
    notes: ['Bridged from expression-level feedback; semantic-label review may still be required.']
  }
}

export const neoPreExpressionLanguageV1 = {
  id: 'NEO-PRE-EXPRESSION-LANGUAGE',
  version: '1.0.0',
  purpose: 'Convert consented intention predictions into auditable likely expression candidates before typing is complete, while preserving language provenance and user correction authority.',
  principles: [
    'Pre-expression prediction concerns likely communication, not ownership of private thought.',
    'Source-attested Nuwaubic/Nuwaupic forms outrank generated completion.',
    'Never fabricate an ancient-language form to fill a lexical gap.',
    'Partial input may narrow candidates but must not erase uncertainty.',
    'User corrections are authoritative for personalization and must remain reversible.',
    'Prefer local-only processing and persistence for intimate expression models.',
    'Semantic intent, lexical form, doctrinal interpretation, and final transmitted message remain separate layers.'
  ],
  generatePreExpressionCandidates,
  applyExpressionFeedback,
  bridgeIntentionFeedback
} as const
