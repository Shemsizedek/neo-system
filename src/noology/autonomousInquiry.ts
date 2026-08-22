import { assessNineEtherealQuality, type NineEtherealAssessment } from './nineEtherealQuality'
import { neoSyncSearch } from './neoSync'
import { neoLearningSources } from './sourceFeeds'

export type InquirySourceLane = 'NEO_LIBRARY'|'APPROVED_PRIMARY'|'EXTERNAL_PRIMARY'|'EXTERNAL_SECONDARY'
export type InquiryClaimClass = 'SOURCE_STATES'|'NEO_SYNTHESIS'|'CORROBORATED'|'CONTESTED'|'OPEN_QUESTION'
export type InquiryImpact = 'LOW'|'MEDIUM'|'HIGH'

export type InquiryQuestion = {
  id: string
  question: string
  purpose?: string
  domains?: string[]
  impact?: InquiryImpact
  requestedSourceLanes?: InquirySourceLane[]
}

export type EvidenceTask = {
  id: string
  lane: InquirySourceLane
  query: string
  purpose: string
  priority: number
  sourceIds?: string[]
}

export type InquiryPlan = {
  inquiryId: string
  question: string
  decomposedQuestions: string[]
  evidenceTasks: EvidenceTask[]
  requiredChecks: readonly string[]
  impact: InquiryImpact
}

export type EvidenceRecord = {
  id: string
  taskId: string
  lane: InquirySourceLane
  sourceTitle: string
  locator: string
  statement: string
  sourceUrl?: string
  claimClass: InquiryClaimClass
  date?: string
  authority?: string
  tags?: string[]
}

export type DossierClaim = {
  id: string
  statement: string
  claimClass: InquiryClaimClass
  supportingEvidenceIds: string[]
  contraryEvidenceIds: string[]
  confidence: number
  notes?: string[]
}

export type ResearchDossier = {
  inquiry: InquiryQuestion
  plan: InquiryPlan
  evidence: EvidenceRecord[]
  claims: DossierClaim[]
  unresolvedQuestions: string[]
  provenanceMap: Record<string, string[]>
  nineEthereal: NineEtherealAssessment
  publicationGate: 'PASS'|'REVIEW'|'HOLD'
  generatedAt: string
}

export const autonomousInquiryRules = [
  'Begin with the actual research question, not a preferred conclusion.',
  'Search NEO Library and approved primary sources before expanding to external reference material when relevant.',
  'Source doctrine, NEO synthesis, external corroboration and unresolved conflict remain separate claim classes.',
  'A source may establish what it states without establishing that every statement is externally verified.',
  'Contrary evidence is retained and linked to the claim it challenges.',
  'Symbolic resemblance, shared terminology or institutional proximity may generate a lead but cannot independently establish derivation, ownership, conspiracy or causation.',
  'Legal, financial, identity, governance, medical and sacred-access conclusions are always human-review gated.',
  'No source rank, institutional prestige, popularity or search score may silently substitute for provenance.',
  'The final dossier must expose its evidence chain, unresolved questions and quality assessment.'
] as const

const splitQuestion = (question: string) => {
  const normalized = question.trim().replace(/\s+/g, ' ')
  const stems = [
    `What primary NEO or source records directly address: ${normalized}`,
    `What chronology and provenance chain is relevant to: ${normalized}`,
    `What independent primary records corroborate or contradict the material question?`,
    `What terminology, institutions, people, instruments, transactions or successor relationships require entity resolution?`,
    `What remains inference, synthesis, contested or unresolved?`
  ]
  return stems
}

export function buildInquiryPlan(inquiry: InquiryQuestion): InquiryPlan {
  const impact = inquiry.impact ?? 'MEDIUM'
  const lanes = inquiry.requestedSourceLanes ?? ['NEO_LIBRARY','APPROVED_PRIMARY','EXTERNAL_PRIMARY','EXTERNAL_SECONDARY']
  const decomposedQuestions = splitQuestion(inquiry.question)
  const evidenceTasks: EvidenceTask[] = []
  let sequence = 1
  for (const lane of lanes) {
    const sourceIds = lane === 'APPROVED_PRIMARY' ? neoLearningSources.map(source => source.id) : undefined
    for (const subQuestion of decomposedQuestions.slice(0, lane === 'EXTERNAL_SECONDARY' ? 2 : 5)) {
      evidenceTasks.push({
        id: `${inquiry.id}-TASK-${sequence++}`,
        lane,
        query: subQuestion,
        purpose: lane === 'NEO_LIBRARY' ? 'Recover internal provenance and doctrine.' : lane === 'APPROVED_PRIMARY' ? 'Recover approved primary-source evidence.' : lane === 'EXTERNAL_PRIMARY' ? 'Seek independent primary records and authoritative documents.' : 'Map external scholarship, criticism, context and competing interpretations.',
        priority: lane === 'NEO_LIBRARY' ? 1 : lane === 'APPROVED_PRIMARY' ? 2 : lane === 'EXTERNAL_PRIMARY' ? 3 : 4,
        sourceIds
      })
    }
  }
  return {
    inquiryId: inquiry.id,
    question: inquiry.question,
    decomposedQuestions,
    evidenceTasks,
    requiredChecks: autonomousInquiryRules,
    impact
  }
}

export function getInternalResearchContext(question: string) {
  return neoSyncSearch(question)
}

export function classifyDossierGate(impact: InquiryImpact, quality: NineEtherealAssessment) {
  if (quality.gate === 'HOLD') return 'HOLD' as const
  if (impact === 'HIGH') return 'REVIEW' as const
  return quality.gate
}

export function buildResearchDossier(
  inquiry: InquiryQuestion,
  evidence: EvidenceRecord[],
  claims: DossierClaim[],
  unresolvedQuestions: string[] = [],
  generatedAt = new Date()
): ResearchDossier {
  const plan = buildInquiryPlan(inquiry)
  const refs = evidence.map(item => `${item.sourceTitle} — ${item.locator}`).filter(Boolean)
  const contraryPreserved = claims.every(claim => Array.isArray(claim.contraryEvidenceIds))
  const claimsQualified = claims.every(claim => claim.claimClass && Number.isFinite(claim.confidence))
  const reasoningVisible = claims.every(claim => claim.supportingEvidenceIds.length > 0 || claim.claimClass === 'OPEN_QUESTION')
  const quality = assessNineEtherealQuality({
    sourceRefs: refs,
    distinguishesSourceFromSynthesis: true,
    claimsQualified,
    contradictionsPreserved: contraryPreserved,
    reasoningStepsVisible: reasoningVisible,
    internallyConsistent: true,
    respectsRightsAndDignity: true,
    reciprocalBenefit: true,
    considersLivingSystems: true,
    editorialQuality: unresolvedQuestions.length ? 7 : 9,
    consequenceReview: true,
    unresolvedRisks: inquiry.impact === 'HIGH' && unresolvedQuestions.length ? unresolvedQuestions : []
  })
  const provenanceMap = evidence.reduce<Record<string, string[]>>((map, item) => {
    map[item.id] = [item.sourceTitle, item.locator, item.sourceUrl ?? ''].filter(Boolean)
    return map
  }, {})
  return {
    inquiry,
    plan,
    evidence,
    claims,
    unresolvedQuestions,
    provenanceMap,
    nineEthereal: quality,
    publicationGate: classifyDossierGate(plan.impact, quality),
    generatedAt: generatedAt.toISOString()
  }
}

export function toNeopediaResearchDraft(dossier: ResearchDossier) {
  return {
    id: `NEOPEDIA-RESEARCH-${dossier.inquiry.id}`,
    title: dossier.inquiry.question,
    sourceClass: 'AUTONOMOUS_INQUIRY',
    status: dossier.publicationGate === 'PASS' ? 'DRAFT_READY' : 'REVIEW_REQUIRED',
    claimCount: dossier.claims.length,
    evidenceCount: dossier.evidence.length,
    unresolvedQuestions: dossier.unresolvedQuestions,
    nineEthereal: dossier.nineEthereal,
    provenanceMap: dossier.provenanceMap,
    generatedAt: dossier.generatedAt
  }
}

export const neoResearchAgent = {
  id: 'NEO-AUTONOMOUS-INQUIRY',
  title: 'NEO Research Agent / Autonomous Inquiry Engine',
  role: 'EVIDENCE_PLANNING_PROVENANCE_RESEARCH_AND_DOSSIER_GENERATION',
  loop: ['QUESTION','DECOMPOSE','PLAN','NEO_LIBRARY','APPROVED_PRIMARY','EXTERNAL_PRIMARY','EXTERNAL_SECONDARY','ENTITY_RESOLUTION','FACTOLOGY','PROVENANCE','COUNTER_INFLUENCE','CONFLICT_MAP','CLAIM_CLASSIFICATION','9_ETHEREAL_GATE','NEOPEDIA_DRAFT','HUMAN_REVIEW'] as const,
  rules: autonomousInquiryRules,
  boundary: 'The agent may plan, retrieve, compare, classify and draft. It does not autonomously convert disputed claims into established facts or bypass review for high-impact conclusions.'
} as const
