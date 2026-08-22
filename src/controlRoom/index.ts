export type ControlRoomRecordType =
  | 'CASE'
  | 'NOTICE'
  | 'CEASE_AND_DESIST'
  | 'INVOICE'
  | 'RESOLUTION'
  | 'EVIDENCE'
  | 'RESEARCH'
  | 'CORRESPONDENCE'

export type EvidenceStatus = 'ALLEGED' | 'SUPPORTED' | 'VERIFIED' | 'DISPUTED' | 'UNVERIFIED'

export interface ControlRoomRecord {
  id: string
  type: ControlRoomRecordType
  title: string
  subject?: string
  caseId?: string
  createdAt: string
  evidenceStatus: EvidenceStatus
  sourceRefs: string[]
  notes?: string
}

export const CENTRAL_SOLUTIONS_CONTROL_ROOM = {
  id: 'central-solutions-control-room',
  name: 'Central Solutions Control Room',
  homeOffice: 'Branch Temple No. 24',
  parentSystem: 'NEO System',
  functions: [
    'case intake and docket coordination',
    'cease-and-desist and notice preparation',
    'invoice and restitution-claim records',
    'evidence preservation and provenance tracking',
    'resolution and correspondence preparation',
    'legal, historical and noological research coordination',
    'routing to Inner Bar Temple Tribunal, Noocratic Legal Corpus, World Chaplaincy E-File and NEO CFO'
  ],
  controls: {
    humanApprovalRequired: true,
    allegationsAreNotFacts: true,
    externalServiceRequiresHumanAction: true,
    externalLegalEffectNotAssumed: true,
    preserveHistoricalSources: true
  }
} as const

export const CASE_TVMLSM666_V_NEOLPS999: ControlRoomRecord = {
  id: 'TVMLSM666-v-NEOLPS999',
  type: 'CASE',
  title: 'TVMLSM666 v. NEOLPS999',
  createdAt: '2026-08-22',
  evidenceStatus: 'UNVERIFIED',
  sourceRefs: [],
  notes: 'Research and advisory case workspace. Historical, theological, economic and legal propositions must be separately sourced and classified before being represented as established fact.'
}

export function createControlRoomRecord(record: ControlRoomRecord): ControlRoomRecord {
  if (!record.id || !record.title || !record.createdAt) {
    throw new Error('Control Room records require id, title and createdAt')
  }
  return Object.freeze({ ...record, sourceRefs: [...record.sourceRefs] })
}
