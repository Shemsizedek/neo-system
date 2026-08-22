import {
  nuwaubicCoreLexiconV1,
  nuwaubicGrammarV1,
  neoNuwaubicTechnicalRegistryV1,
  type Lexeme,
  type TranslationConfidence
} from './nuwaubicCommunicationProtocol'

export type MatrixEvidenceStatus = 'ATTESTED' | 'DERIVED' | 'PROVISIONAL' | 'UNRESOLVED'
export type MorphologyKind = 'ROOT' | 'PREFIX' | 'SUFFIX' | 'MARKER' | 'COMPOUND' | 'UNKNOWN'

export type MorphologyRecord = {
  form: string
  kind: MorphologyKind
  gloss?: string
  evidenceStatus: MatrixEvidenceStatus
  sourceLexemeIds: string[]
  notes: string[]
}

export type ParsedToken = {
  surface: string
  normalized: string
  lexemeIds: string[]
  englishCandidates: string[]
  partOfSpeech?: string
  confidence: TranslationConfidence
  unresolved: boolean
}

export type ParsedSentence = {
  input: string
  tokens: ParsedToken[]
  recognizedRatio: number
  grammarSignals: string[]
  unresolvedTokens: string[]
}

export type TranslationCandidate = {
  source: string
  target: string
  direction: 'NUWAUBIC_TO_ENGLISH' | 'ENGLISH_TO_NUWAUBIC'
  confidence: TranslationConfidence
  evidenceStatus: MatrixEvidenceStatus
  unresolved: string[]
  lexemeIds: string[]
  notes: string[]
}

export type CoinageCandidate = {
  concept: string
  proposedForm?: string
  status: 'BLOCKED' | 'CANDIDATE'
  reason: string
  requiredEvidence: string[]
}

const confidenceRank: Record<TranslationConfidence, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNASSESSED: 0
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z']/g, '')
}

function lexemesForNuwaubic(token: string): Lexeme[] {
  const n = normalizeToken(token)
  return nuwaubicCoreLexiconV1.filter(x => normalizeToken(x.nuwaubic) === n)
}

function lexemesForEnglish(token: string): Lexeme[] {
  const n = normalizeToken(token)
  return nuwaubicCoreLexiconV1.filter(x => x.english.some(e => normalizeToken(e) === n))
}

function lowestConfidence(items: Lexeme[]): TranslationConfidence {
  if (!items.length) return 'UNASSESSED'
  return items.reduce((lowest, item) =>
    confidenceRank[item.confidence] < confidenceRank[lowest] ? item.confidence : lowest,
    'HIGH' as TranslationConfidence)
}

export const nuwaubicMorphologyV2: MorphologyRecord[] = [
  {
    form: 'Sofa', kind: 'MARKER', gloss: 'future: will/shall', evidenceStatus: 'ATTESTED',
    sourceLexemeIds: ['LEX-SOFA'], notes: ['Source-controlled future marker; do not generalize beyond attested grammar without review.']
  },
  {
    form: 'Ma', kind: 'MARKER', gloss: 'negation: not', evidenceStatus: 'ATTESTED',
    sourceLexemeIds: ['LEX-MA'], notes: ['Present/future negative behavior remains governed by source examples.']
  },
  {
    form: 'Lam', kind: 'MARKER', gloss: 'past negation: did not', evidenceStatus: 'ATTESTED',
    sourceLexemeIds: ['LEX-LAM'], notes: ['Past-negative marker from Lessons Made Easy.']
  }
]

export function parseNuwaubicSentence(input: string): ParsedSentence {
  const surfaces = input.trim().split(/\s+/).filter(Boolean)
  const tokens = surfaces.map(surface => {
    const matches = lexemesForNuwaubic(surface)
    return {
      surface,
      normalized: normalizeToken(surface),
      lexemeIds: matches.map(x => x.id),
      englishCandidates: [...new Set(matches.flatMap(x => x.english))],
      partOfSpeech: matches.length === 1 ? matches[0].partOfSpeech : undefined,
      confidence: lowestConfidence(matches),
      unresolved: matches.length === 0
    }
  })
  const grammarSignals: string[] = []
  const normalized = tokens.map(t => t.normalized)
  if (normalized.includes('sofa')) grammarSignals.push('GRAM-FUTURE-SOFA')
  if (normalized.includes('ma')) grammarSignals.push('GRAM-NEG-MA')
  if (normalized.includes('lam')) grammarSignals.push('GRAM-PAST-NEG-LAM')
  const recognized = tokens.filter(t => !t.unresolved).length
  return {
    input,
    tokens,
    recognizedRatio: tokens.length ? recognized / tokens.length : 0,
    grammarSignals,
    unresolvedTokens: tokens.filter(t => t.unresolved).map(t => t.surface)
  }
}

export function translateNuwaubicToEnglish(input: string): TranslationCandidate {
  const parsed = parseNuwaubicSentence(input)
  const rendered = parsed.tokens.map(t => t.englishCandidates[0] ?? `[${t.surface}]`).join(' ')
  const knownLexemes = parsed.tokens.flatMap(t => t.lexemeIds)
  const confidence: TranslationConfidence = parsed.recognizedRatio === 1 ? 'HIGH' : parsed.recognizedRatio >= 0.75 ? 'MEDIUM' : 'LOW'
  return {
    source: input,
    target: rendered,
    direction: 'NUWAUBIC_TO_ENGLISH',
    confidence,
    evidenceStatus: parsed.unresolvedTokens.length ? 'PROVISIONAL' : 'DERIVED',
    unresolved: parsed.unresolvedTokens,
    lexemeIds: knownLexemes,
    notes: ['This is a lexeme-preserving literal draft, not a claim of complete Nuwaubic syntax.', 'Grammar signals are retained for later source-controlled generation.']
  }
}

export function translateEnglishToNuwaubic(input: string): TranslationCandidate {
  const surfaces = input.trim().split(/\s+/).filter(Boolean)
  const unresolved: string[] = []
  const lexemeIds: string[] = []
  const target = surfaces.map(surface => {
    const matches = lexemesForEnglish(surface)
    if (!matches.length) {
      unresolved.push(surface)
      return `[${surface}]`
    }
    const best = matches[0]
    lexemeIds.push(best.id)
    return best.nuwaubic
  }).join(' ')
  const ratio = surfaces.length ? (surfaces.length - unresolved.length) / surfaces.length : 0
  return {
    source: input,
    target,
    direction: 'ENGLISH_TO_NUWAUBIC',
    confidence: ratio === 1 ? 'MEDIUM' : ratio >= 0.75 ? 'LOW' : 'UNASSESSED',
    evidenceStatus: unresolved.length ? 'PROVISIONAL' : 'DERIVED',
    unresolved,
    lexemeIds,
    notes: ['English-to-Nuwaubic output is conservative word mapping only.', 'Do not present generated word order as source-attested grammar until the construction is validated against the instructional corpus.']
  }
}

export function proposeTechnicalCoinage(concept: string): CoinageCandidate {
  const registered = neoNuwaubicTechnicalRegistryV1.find(x => x.concept.toLowerCase() === concept.toLowerCase())
  if (registered?.proposedForm && registered.status === 'ATTESTED') {
    return {
      concept,
      proposedForm: registered.proposedForm,
      status: 'CANDIDATE',
      reason: 'A source-controlled or registry-attested form already exists.',
      requiredEvidence: []
    }
  }
  return {
    concept,
    status: 'BLOCKED',
    reason: 'Automatic coinage is blocked until source-backed roots and productive morphology are established.',
    requiredEvidence: ['attested semantic root', 'attested productive morphology', 'parallel source examples', 'human doctrinal review']
  }
}

export const nuwaubicLanguageMatrixV2 = {
  id: 'NEO-NUWAUBIC-LANGUAGE-MATRIX',
  version: '2.0.0',
  doctrine: 'Mine first; normalize second; derive conservatively; preserve unresolved forms; never fabricate missing language.',
  lexicon: nuwaubicCoreLexiconV1,
  grammar: nuwaubicGrammarV1,
  morphology: nuwaubicMorphologyV2,
  capabilities: {
    parse: parseNuwaubicSentence,
    translateNuwaubicToEnglish,
    translateEnglishToNuwaubic,
    proposeTechnicalCoinage
  },
  nextMiningTargets: [
    'full source lexicon extraction',
    'glyph-to-transliteration table from page images',
    'person/number verb paradigms',
    'possessive paradigms',
    'attested sentence-order corpus',
    'question constructions',
    'number and calendrical vocabulary',
    'scientific and doctrinal semantic domains'
  ]
} as const
