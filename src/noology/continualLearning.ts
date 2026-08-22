export type LearningSourceClass = 'PRIMARY_SACRED'|'PRIMARY_INSTITUTIONAL'|'NEO_INTERNAL'|'EXTERNAL_REFERENCE'
export type LearningDecision = 'ACCEPTED'|'CANDIDATE'|'CONFLICT'|'REJECTED'|'REVIEW_REQUIRED'
export type RelationKind = 'SUPPORTS'|'CONTRADICTS'|'REFINES'|'RENAMES'|'DERIVES_FROM'|'PARALLELS'|'SUPERSEDES'|'UNRESOLVED'

export type LearningSource = {
  id: string
  title: string
  url?: string
  sourceClass: LearningSourceClass
  authorityScope: string[]
  mutable: boolean
  captureTyposAndVariants?: boolean
}

export type LearningObservation = {
  id: string
  sourceId: string
  title: string
  statement: string
  tags: string[]
  locator?: string
  observedAt: string
  sourceStatus: 'SOURCE_STATES'|'NEO_SYNTHESIS'|'CORROBORATED'|'CONTESTED'|'OPEN_QUESTION'
}

export type LearningRelation = {
  fromId: string
  toId: string
  kind: RelationKind
  rationale: string
  confidence: number
  evidenceRefs: string[]
  decision: LearningDecision
}

export type LearningCycle = {
  observed: LearningObservation[]
  relations: LearningRelation[]
  promoted: LearningRelation[]
  heldForReview: LearningRelation[]
}

export const continualLearningRules = [
  'Never overwrite a primary source with a later summary.',
  'Novelty is not truth; popularity is not corroboration.',
  'Keep source doctrine, NEO synthesis and external verification in separate claim classes.',
  'A contradiction is preserved as data until resolved; it is not silently harmonized.',
  'Automatic promotion requires provenance, a source locator and sufficient evidence confidence.',
  'Symbolic or linguistic similarity may create a candidate relation but cannot prove derivation by itself.',
  'Typos, variant spellings and historical revisions are preserved as aliases or revision events rather than erased.',
  'Learning may update the knowledge graph and retrieval layer; it must not autonomously rewrite protected source records.',
  'Human review remains required for high-impact legal, financial, medical, identity, sacred-access or governance conclusions.'
] as const

export function evaluateLearningRelation(relation: Omit<LearningRelation,'decision'>): LearningRelation {
  let decision: LearningDecision = 'CANDIDATE'
  if (relation.kind === 'CONTRADICTS') decision = 'CONFLICT'
  else if (!relation.evidenceRefs.length) decision = 'REVIEW_REQUIRED'
  else if (relation.confidence >= 0.9 && ['SUPPORTS','REFINES','DERIVES_FROM','RENAMES'].includes(relation.kind)) decision = 'ACCEPTED'
  else if (relation.confidence < 0.35) decision = 'REJECTED'
  return { ...relation, decision }
}

export function runContinualLearning(observed: LearningObservation[], proposedRelations: Array<Omit<LearningRelation,'decision'>>): LearningCycle {
  const relations = proposedRelations.map(evaluateLearningRelation)
  return {
    observed,
    relations,
    promoted: relations.filter(r => r.decision === 'ACCEPTED'),
    heldForReview: relations.filter(r => ['CANDIDATE','CONFLICT','REVIEW_REQUIRED'].includes(r.decision))
  }
}

export const neoSelfLearning = {
  id: 'NEO-CONTINUAL-LEARNING',
  title: 'NEO Continual Learning Engine',
  technicalPattern: 'continual learning + provenance-preserving RAG + active knowledge-graph refinement',
  purpose: 'Allow NEO Sync to absorb new sources, detect continuity, contradiction and novelty, and improve retrieval and graph connections without destructive retraining or provenance loss.',
  rules: continualLearningRules
} as const
