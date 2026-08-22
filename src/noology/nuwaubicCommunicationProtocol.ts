export type NuwaubicSourceStatus = 'SOURCE_ATTESTED' | 'NORMALIZED_FROM_SOURCE' | 'NEO_PROVISIONAL' | 'REVIEW_REQUIRED'
export type TranslationConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNASSESSED'
export type MessageLayer = 'NUWAUBIC_TEXT' | 'TRANSLITERATION' | 'LITERAL_GLOSS' | 'DOCTRINAL_GLOSS' | 'TECHNICAL_GLOSS' | 'CIPHERTEXT'

export type ProvenanceRef = {
  sourceId: string
  title: string
  locator: string
  note?: string
}

export type AlphabetEntry = {
  latin: string
  reading: string
  exampleCue: string
  sourceStatus: NuwaubicSourceStatus
  provenance: ProvenanceRef[]
}

export type Lexeme = {
  id: string
  nuwaubic: string
  english: string[]
  partOfSpeech?: string
  sourceStatus: NuwaubicSourceStatus
  confidence: TranslationConfidence
  provenance: ProvenanceRef[]
}

export type GrammarRule = {
  id: string
  name: string
  rule: string
  sourceStatus: NuwaubicSourceStatus
  provenance: ProvenanceRef[]
}

export type TechnicalTerm = {
  concept: string
  proposedForm?: string
  status: 'ATTESTED' | 'PROVISIONAL' | 'RESERVED_FOR_COINAGE'
  definition: string
  formationNotes: string[]
  reviewRequired: boolean
}

export type CommunicationEnvelope = {
  protocol: 'NEO-NUWAUBIC-COMMUNICATION-PROTOCOL'
  version: '1.0.0'
  messageId: string
  createdAt: string
  language: 'NUWAUBIC'
  layers: Partial<Record<MessageLayer, string>>
  confidence: TranslationConfidence
  provenanceRefs: string[]
  terminologyVersion: string
  integrity?: {
    contentHash?: string
    signature?: string
    signatureAlgorithm?: string
  }
  encryption?: {
    encrypted: boolean
    algorithm?: string
    keyId?: string
    nonce?: string
  }
}

export type CryptoAdapter = {
  algorithm: string
  encrypt(plaintext: string, keyId: string): Promise<{ ciphertext: string; nonce?: string }>
  decrypt(ciphertext: string, keyId: string, nonce?: string): Promise<string>
  sign?(message: string, keyId: string): Promise<string>
  verify?(message: string, signature: string, keyId: string): Promise<boolean>
}

const teachersGuide: ProvenanceRef = {
  sourceId: 'SRC-NUWAUBIC-TEACHERS-GUIDE',
  title: "Teacher's Guide To The Nuwaubian Language",
  locator: 'Lessons One-Two: alphabet, pronunciation and reading drills'
}

const lessonsMadeEasy: ProvenanceRef = {
  sourceId: 'SRC-NUWAUBIC-LESSONS-MADE-EASY',
  title: 'Nuwaubic Lessons Made Easy For You',
  locator: 'Lessons Two-Five: tense, negation, pronouns, possession, translation and reading exercises'
}

export const nuwaubicAlphabetV1: AlphabetEntry[] = [
  ['A','Ah','all'], ['B','Be','bee'], ['D','De','demand'], ['E','E','eat'], ['F','Fe','feel'],
  ['G','Ge','gear'], ['H','He','here'], ['I','I','eye'], ['J','Je','jeep'], ['K','Ke','keep'],
  ['L','Le','lean'], ['M','Me','meet'], ['N','Ne','near'], ['O','Ow','over'], ['R','Re','reel'],
  ['S','Se','see'], ['T','Te','team'], ['U','U','you'], ['W','We','wheel'], ['Y','Ye','year'], ['Z','Ze','zebra'],
  ["A'","A'","an"], ['Gh','Ghe','ghetto'], ['Kh','Khe','khazar'], ['Sh','She','shoe'], ['Th','The','this']
].map(([latin, reading, exampleCue]) => ({
  latin, reading, exampleCue,
  sourceStatus: 'NORMALIZED_FROM_SOURCE' as const,
  provenance: [teachersGuide]
}))

export const nuwaubicCoreLexiconV1: Lexeme[] = [
  { id:'LEX-ANE', nuwaubic:'Ane', english:['I'], partOfSpeech:'pronoun', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-ENT', nuwaubic:'Ent', english:['you'], partOfSpeech:'pronoun', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-HU', nuwaubic:'Hu', english:['he'], partOfSpeech:'pronoun', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-HA', nuwaubic:'Ha', english:['she'], partOfSpeech:'pronoun', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-NA', nuwaubic:'Na', english:['we'], partOfSpeech:'pronoun', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-HUM', nuwaubic:'Hum', english:['they'], partOfSpeech:'pronoun', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-ENTUM', nuwaubic:'Entum', english:['you all'], partOfSpeech:'pronoun', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-NAZUR', nuwaubic:'Nazur', english:['see','look'], partOfSpeech:'verb', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-NATUG', nuwaubic:'Natug', english:['say'], partOfSpeech:'verb', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-HADUR', nuwaubic:'Hadur', english:['come'], partOfSpeech:'verb', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-KATAB', nuwaubic:'Katub', english:['book','scripture'], partOfSpeech:'noun', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-SHAKHUS', nuwaubic:'Shakhus', english:['person'], partOfSpeech:'noun', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-DEK', nuwaubic:'Dek', english:['that'], partOfSpeech:'demonstrative', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-HAZA', nuwaubic:'Haza', english:['this'], partOfSpeech:'demonstrative', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-WENU', nuwaubic:'Wenu', english:['where'], partOfSpeech:'interrogative', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-LAY', nuwaubic:'Lay', english:['why'], partOfSpeech:'interrogative', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-SOFA', nuwaubic:'Sofa', english:['will','shall'], partOfSpeech:'future marker', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-MA', nuwaubic:'Ma', english:['not'], partOfSpeech:'negative marker', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-LAM', nuwaubic:'Lam', english:["didn't",'did not'], partOfSpeech:'past-negative marker', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] },
  { id:'LEX-ILA', nuwaubic:'Ila', english:['to','toward'], partOfSpeech:'preposition', sourceStatus:'SOURCE_ATTESTED', confidence:'HIGH', provenance:[lessonsMadeEasy] }
]

export const nuwaubicGrammarV1: GrammarRule[] = [
  {
    id:'GRAM-FUTURE-SOFA', name:'Future tense marker',
    rule:'The instructional source forms the future with Sofa plus the present-tense form.',
    sourceStatus:'SOURCE_ATTESTED', provenance:[lessonsMadeEasy]
  },
  {
    id:'GRAM-NEG-MA', name:'General negation marker',
    rule:'Ma is used as a negation marker; lesson examples distinguish present/future negative constructions.',
    sourceStatus:'SOURCE_ATTESTED', provenance:[lessonsMadeEasy]
  },
  {
    id:'GRAM-PAST-NEG-LAM', name:'Past negative marker',
    rule:'Lam is taught as the past-tense negative corresponding to did not/didn\'t.',
    sourceStatus:'SOURCE_ATTESTED', provenance:[lessonsMadeEasy]
  },
  {
    id:'GRAM-DEFINITE-ARTICLE', name:'Definite article',
    rule:'The lessons teach El as the definite article and place it before a noun.',
    sourceStatus:'SOURCE_ATTESTED', provenance:[lessonsMadeEasy]
  },
  {
    id:'GRAM-POSSESSION', name:'Possessive joining',
    rule:'Possessive markers are joined to the noun in the instructional examples; exact person/number forms must remain source-controlled.',
    sourceStatus:'NORMALIZED_FROM_SOURCE', provenance:[lessonsMadeEasy]
  }
]

export const neoNuwaubicTechnicalRegistryV1: TechnicalTerm[] = [
  { concept:'NEO Sync', status:'RESERVED_FOR_COINAGE', definition:'NEO orchestration and synchronization intelligence.', formationNotes:['Do not invent a Nuwaubic form until morphology and root rules are source-validated.'], reviewRequired:true },
  { concept:'Noology', status:'ATTESTED', proposedForm:'Noone', definition:'Science of Sound Right Reason within the Noone corpus.', formationNotes:['Preserve source-specific distinction among Noone, Noology and related doctrinal forms.'], reviewRequired:false },
  { concept:'Factology', status:'RESERVED_FOR_COINAGE', definition:'NEO evidence-verification discipline.', formationNotes:['Candidate form must be derived only after root/morphology review.'], reviewRequired:true },
  { concept:'Tesseract Power', status:'RESERVED_FOR_COINAGE', definition:'NEO multidimensional reasoning construct.', formationNotes:['Keep mathematical and Noological senses separately addressable.'], reviewRequired:true },
  { concept:'World Credit Clock', status:'RESERVED_FOR_COINAGE', definition:'NEO global mutual-credit/time-accounting system.', formationNotes:['Financial terms require semantic precision and governance review.'], reviewRequired:true },
  { concept:'NEO Oracle', status:'RESERVED_FOR_COINAGE', definition:'Neoteric inference/divination and evidence-synthesis interface.', formationNotes:['Do not encode divinatory output as verified fact.'], reviewRequired:true }
]

export const neoNuwaubicCommunicationProtocolV1 = {
  id: 'NEO-NUWAUBIC-COMMUNICATION-PROTOCOL',
  version: '1.0.0',
  purpose: 'Enable source-preserving Nuwaubic communication, machine-normalized transliteration, controlled technical terminology, translation auditing, and cryptographically protected transport.',
  principles: [
    'Preserve original glyph text whenever available; transliteration never replaces the source layer.',
    'Every normalized word or grammar rule retains source provenance.',
    'Do not silently coin doctrinal or technical vocabulary. New forms remain provisional until approved.',
    'Language obscurity is not encryption. Confidentiality requires standard authenticated cryptography.',
    'Literal translation, doctrinal interpretation and technical interpretation are separate message layers.',
    'Low-confidence translations must remain visibly low-confidence and route to review.',
    'Source-attested grammar outranks algorithmic completion when they conflict.',
    'Communication integrity requires hashes/signatures independently of language choice.'
  ],
  alphabet: nuwaubicAlphabetV1,
  lexicon: nuwaubicCoreLexiconV1,
  grammar: nuwaubicGrammarV1,
  technicalRegistry: neoNuwaubicTechnicalRegistryV1
} as const

export function translationConfidenceScore(confidence: TranslationConfidence): number {
  return ({ HIGH: 0.95, MEDIUM: 0.75, LOW: 0.45, UNASSESSED: 0 })[confidence]
}

export function buildNuwaubicEnvelope(input: {
  messageId: string
  createdAt: string
  nuwaubicText?: string
  transliteration?: string
  literalGloss?: string
  doctrinalGloss?: string
  technicalGloss?: string
  confidence?: TranslationConfidence
  provenanceRefs?: string[]
}): CommunicationEnvelope {
  return {
    protocol: 'NEO-NUWAUBIC-COMMUNICATION-PROTOCOL',
    version: '1.0.0',
    messageId: input.messageId,
    createdAt: input.createdAt,
    language: 'NUWAUBIC',
    layers: {
      ...(input.nuwaubicText ? { NUWAUBIC_TEXT: input.nuwaubicText } : {}),
      ...(input.transliteration ? { TRANSLITERATION: input.transliteration } : {}),
      ...(input.literalGloss ? { LITERAL_GLOSS: input.literalGloss } : {}),
      ...(input.doctrinalGloss ? { DOCTRINAL_GLOSS: input.doctrinalGloss } : {}),
      ...(input.technicalGloss ? { TECHNICAL_GLOSS: input.technicalGloss } : {})
    },
    confidence: input.confidence ?? 'UNASSESSED',
    provenanceRefs: input.provenanceRefs ?? [],
    terminologyVersion: 'neo-nuwaubic-tech-v1'
  }
}

export async function encryptNuwaubicEnvelope(
  envelope: CommunicationEnvelope,
  adapter: CryptoAdapter,
  keyId: string
): Promise<CommunicationEnvelope> {
  const plaintext = JSON.stringify(envelope.layers)
  const encrypted = await adapter.encrypt(plaintext, keyId)
  return {
    ...envelope,
    layers: { CIPHERTEXT: encrypted.ciphertext },
    encryption: { encrypted: true, algorithm: adapter.algorithm, keyId, nonce: encrypted.nonce }
  }
}
