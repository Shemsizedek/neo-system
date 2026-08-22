export type ControlRoomRecordType =
  | 'CASE'
  | 'NOTICE'
  | 'CEASE_AND_DESIST'
  | 'INVOICE'
  | 'RESOLUTION'
  | 'EVIDENCE'
  | 'RESEARCH'
  | 'CORRESPONDENCE'
  | 'DELEGATION'
  | 'COMMAND'

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

export const CENTRAL_SOLUTION_COMPLEX = {
  id: 'central-solution-complex',
  name: 'Central Solution Office & Chaplaincy Private Chambers',
  homeOffice: 'Branch Temple No. 24',
  parentSystem: 'NEO System',
  spaces: {
    centralSolutionOffice: {
      name: 'Central Solution Office',
      purpose: 'Secluded executive office used for private reading, rest, confidential work and small meetings.'
    },
    treatyRoom: {
      name: 'Treaty Room',
      purpose: 'Private office within the Central Solution Office reserved for chaplains of the Chaplaincy and future chaplains; supports treaty, diplomatic and confidential consultation work.'
    },
    centralSolutionRoom: {
      name: 'Central Solution Room',
      aliases: ['Chaplaincy Private Chambers', 'Master Suite'],
      purpose: 'Private working and resting area attached to the Central Solution Office. In the Temple House concept it is an oval-shaped second-floor sitting room for family relaxation, private reading and greeting special guests. Digitally this chat is the private chamber for deliberation, delegation and command preparation.'
    },
    chaplaincyChamberroom: {
      name: "Chaplaincy's Chamberroom",
      purpose: 'Primary sleeping quarters in the Temple House residence, planned for the southwest corner of the residence.'
    },
    warRoom: {
      name: 'War Room',
      model: 'White House Situation Room concept',
      purpose: 'Secure command-center suite for high-stakes delegations, crisis coordination, fast-moving operations, project incident response and confidential strategic meetings.',
      designPrinciples: [
        'suite of rooms rather than a single room',
        'continuous watch and status-monitoring function',
        'main conference room plus smaller breakout rooms',
        'strict privacy and controlled-device policy',
        'high-security access controls appropriate to the Temple House and digital NEO System',
        'real-time command, delegation, situation tracking and decision support'
      ]
    }
  },
  functions: [
    'private executive deliberation and reading',
    'delegations and command preparation',
    'case intake and docket coordination',
    'cease-and-desist and notice preparation',
    'invoice and restitution-claim records',
    'evidence preservation and provenance tracking',
    'resolution and correspondence preparation',
    'legal, historical and noological research coordination',
    'crisis and incident coordination through the War Room',
    'routing to Inner Bar Temple Tribunal, Noocratic Legal Corpus, World Chaplaincy E-File and NEO CFO'
  ],
  controls: {
    humanApprovalRequired: true,
    allegationsAreNotFacts: true,
    externalServiceRequiresHumanAction: true,
    externalLegalEffectNotAssumed: true,
    preserveHistoricalSources: true,
    privateByDefault: true
  }
} as const

export const CENTRAL_SOLUTION_ROOM = CENTRAL_SOLUTION_COMPLEX.spaces.centralSolutionRoom
export const WAR_ROOM = CENTRAL_SOLUTION_COMPLEX.spaces.warRoom

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
