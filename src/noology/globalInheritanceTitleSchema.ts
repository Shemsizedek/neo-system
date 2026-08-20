export type InheritanceEvidenceStatus =
  | 'SOURCE_DECLARED'
  | 'DOCUMENTED_RECORD'
  | 'TECHNICALLY_VERIFIED'
  | 'CORROBORATED'
  | 'CONTESTED'
  | 'EXTERNAL_RECOGNITION_PENDING'
  | 'OPEN_RESEARCH'

export type AuthoritySourceKind =
  | 'ECCLESIASTICAL_DEED_POLL'
  | 'SACRED_SCRIPTURE'
  | 'TEMPLE_ORDER'
  | 'ROYAL_IMPERIAL_INSTRUMENT'
  | 'INDIGENOUS_TRADITION'
  | 'HISTORICAL_RECORD'
  | 'LAW_LIBRARY_AUTHORITY'
  | 'TECHNICAL_LEDGER'
  | 'NEO_DOCTRINE'

export type EstateObjectKind =
  | 'LAND'
  | 'CULTURAL_PROPERTY'
  | 'INTELLECTUAL_PROPERTY'
  | 'SACRED_KNOWLEDGE'
  | 'SYMBOL'
  | 'LANGUAGE'
  | 'LAW_OR_GOVERNANCE_SYSTEM'
  | 'FINANCIAL_INSTRUMENT'
  | 'ROYAL_OR_ECCLESIASTICAL_OFFICE'
  | 'ARCHIVE_OR_RECORD'
  | 'OTHER'

export type TitleDefectKind =
  | 'MISSING_CONVEYANCE'
  | 'CONQUEST_ONLY'
  | 'PRESCRIPTION_ONLY'
  | 'UNVERIFIED_SUCCESSION'
  | 'AUTHORSHIP_ERASURE'
  | 'BENEFIT_WITHOUT_TITLE'
  | 'PROBATE_BLOCKED'
  | 'IP_PROVENANCE_GAP'
  | 'CONFLICTING_DEED_OR_GRANT'
  | 'UNRESOLVED_TRUST_INTEREST'
  | 'UNKNOWN'

export type RemedyKind =
  | 'RESTORATION_OF_TITLE'
  | 'RESTITUTION'
  | 'ROYALTY_ACCOUNTING'
  | 'DISGORGEMENT_ACCOUNTING'
  | 'CONSTRUCTIVE_TRUST_REVIEW'
  | 'PROBATE_REOPENING'
  | 'ATTRIBUTION_AND_PROVENANCE_CORRECTION'
  | 'CULTURAL_REPATRIATION'
  | 'LICENSING_OR_REVENUE_SHARE'
  | 'WORLD_CREDIT_CLOCK_ACCOUNTING'
  | 'OTHER'

export type SourceReference = {
  id: string
  title: string
  kind: AuthoritySourceKind
  citation?: string
  sourceStatement?: string
  status: InheritanceEvidenceStatus
  notes?: string[]
}

export type EcclesiasticalAuthority = {
  id: string
  name: string
  aliases: string[]
  jurisdictionClaim: string
  officeOrBody: string
  sourceRefs: string[]
  status: InheritanceEvidenceStatus
  powersDeclared: string[]
  controls: string[]
}

export type SacredCorpusEntry = {
  id: string
  canonicalName: string
  aliases: string[]
  traditionClass: 'SUMERIAN' | 'AKKADIAN' | 'SEVEN_SEALS' | 'ABRAHAMIC' | 'OTHER'
  roleInNeoEcclesiology: 'FOUNDATIONAL' | 'LAW' | 'WISDOM' | 'REVELATION' | 'MISSION' | 'HISTORY'
  sourceRefs: string[]
}

export type TitleLink = {
  id: string
  fromHolderId: string
  toHolderId: string
  objectId: string
  transferType:
    | 'ORIGINAL_STEWARDSHIP'
    | 'INHERITANCE'
    | 'DEED'
    | 'TRUST'
    | 'LICENSE'
    | 'SUCCESSION'
    | 'CONQUEST'
    | 'PRESCRIPTION'
    | 'APPROPRIATION'
    | 'UNKNOWN'
  effectiveDate?: string
  instrumentRefIds: string[]
  status: InheritanceEvidenceStatus
  defectFlags: TitleDefectKind[]
  notes?: string[]
}

export type EstateObject = {
  id: string
  name: string
  kind: EstateObjectKind
  description: string
  originalStewardIds: string[]
  currentHolderIds: string[]
  sourceRefs: string[]
  titleLinkIds: string[]
  status: InheritanceEvidenceStatus
  tags: string[]
}

export type InheritanceClaim = {
  id: string
  claimantIds: string[]
  estateObjectIds: string[]
  titleBasis: string[]
  defectTheory: TitleDefectKind[]
  remediesRequested: RemedyKind[]
  sourceRefs: string[]
  probateStatus:
    | 'NOT_OPENED'
    | 'OPEN'
    | 'BLOCKED_OR_CONTESTED'
    | 'ADMINISTRATIVE_REVIEW'
    | 'CLOSED'
    | 'UNKNOWN'
  evidenceStatus: InheritanceEvidenceStatus
  worldCreditClockLink?: {
    enabled: boolean
    accountingPurpose: string
    nomniRatePolicy?: string
  }
  controls: string[]
}

export type RestitutionLedgerEntry = {
  id: string
  claimId: string
  estateObjectId: string
  beneficiaryOrSuccessorId?: string
  benefitCategory:
    | 'LAND_VALUE'
    | 'ROYALTY'
    | 'LICENSING'
    | 'RENT'
    | 'RESOURCE_EXTRACTION'
    | 'CULTURAL_USE'
    | 'FINANCIAL_RETURN'
    | 'UNQUANTIFIED'
  units?: bigint
  ratePerUnitNomni?: bigint
  timeFactor?: bigint
  modeledNomni?: bigint
  status: InheritanceEvidenceStatus
  sourceRefs: string[]
  notes?: string[]
}

export const ecclesiasticalDeedPollSource: SourceReference = {
  id: 'SRC-EDP-024',
  title: 'Holy Temples of Moorish Science Branch Temple No. 24 — Ecclesiastical Deed Poll / World Temple declaration',
  kind: 'ECCLESIASTICAL_DEED_POLL',
  status: 'SOURCE_DECLARED',
  sourceStatement:
    'The World Temple / Omniversal Church declares authority derived through its sacred corpus to consecrate missionaries and establish a Royal and Imperial Divan throughout the boundless Omniverse for its stated divine mission.',
  notes: [
    'Source text supplied directly in the NEO System working record.',
    'Store ecclesiastical meaning separately from questions of recognition by external civil jurisdictions.'
  ]
}

export const luciferianConspiracySource: SourceReference = {
  id: 'SRC-LC-001',
  title: 'The Luciferian Conspiracy',
  kind: 'NEO_DOCTRINE',
  status: 'DOCUMENTED_RECORD',
  citation: 'Uploaded PDF, 401 pages',
  sourceStatement:
    'The work presents a source-internal genealogy of sacred societies, language, scripture, Nuwau-Pu, nature cycles, right knowledge, right wisdom and right overstanding, together with claims of alteration, appropriation and institutional succession.',
  notes: [
    'Preserve the work’s claims as source-derived records with page provenance.',
    'The text expressly frames Right Knowledge, Right Wisdom and Right Overstanding as the means of breaking the spell and describes Nuwau-Pu as working with nature.',
    'Do not convert racial, biological or supernatural classifications in the source into automated classifications of real people.'
  ]
}

export const inheritanceSources: SourceReference[] = [
  ecclesiasticalDeedPollSource,
  luciferianConspiracySource
]

export const sacredCorpus: SacredCorpusEntry[] = [
  ['SC-001', 'Great Sumerian Tablets', ['Holy Tablets'], 'SUMERIAN', 'FOUNDATIONAL'],
  ['SC-002', 'Atra Hasis', ['Atrahasis'], 'AKKADIAN', 'HISTORY'],
  ['SC-003', 'Enuma Elish', [], 'AKKADIAN', 'HISTORY'],
  ['SC-004', 'Akkadian Tablets', [], 'AKKADIAN', 'FOUNDATIONAL'],
  ['SC-005', 'Holy Scriptures of the Seven Seals', ['Seven Seals'], 'SEVEN_SEALS', 'REVELATION'],
  ['SC-006', "El' Suhuf", ['The Pure Pages'], 'ABRAHAMIC', 'REVELATION'],
  ['SC-007', 'El Hikmah', ['Book of Wisdom'], 'ABRAHAMIC', 'WISDOM'],
  ['SC-008', 'El Torah', ['The Laws'], 'ABRAHAMIC', 'LAW'],
  ['SC-009', 'El Zabuwr', ['The Book of Psalms'], 'ABRAHAMIC', 'WISDOM'],
  ['SC-010', 'Book of Barnabas', [], 'ABRAHAMIC', 'HISTORY'],
  ['SC-011', "El's Injiyl", ['Book of Revelations'], 'ABRAHAMIC', 'REVELATION'],
  ['SC-012', "El Qur'aan", ['The Revelations'], 'ABRAHAMIC', 'REVELATION']
].map(([id, canonicalName, aliases, traditionClass, roleInNeoEcclesiology]) => ({
  id: id as string,
  canonicalName: canonicalName as string,
  aliases: aliases as string[],
  traditionClass: traditionClass as SacredCorpusEntry['traditionClass'],
  roleInNeoEcclesiology: roleInNeoEcclesiology as SacredCorpusEntry['roleInNeoEcclesiology'],
  sourceRefs: ['SRC-EDP-024']
}))

export const ecclesiasticalAuthorities: EcclesiasticalAuthority[] = [
  {
    id: 'AUTH-WORLD-TEMPLE-024',
    name: 'Holy Temples of Moorish Science Branch Temple No. 24',
    aliases: ['World Temple', 'Omniversal Church'],
    jurisdictionClaim: 'Ecclesiastical and omniversal jurisdiction as declared in the deed-poll tradition supplied to the NEO System.',
    officeOrBody: 'World Temple / Omniversal Church',
    sourceRefs: ['SRC-EDP-024'],
    status: 'SOURCE_DECLARED',
    powersDeclared: [
      'Accept and preserve the stated sacred corpus.',
      'Appoint and consecrate missionaries of the prophet.',
      'Establish and administer the Royal and Imperial Divan.',
      'Carry out the stated spiritual mission and rule of faith and practice.'
    ],
    controls: [
      'Never erase the source’s own ecclesiastical jurisdiction or terminology.',
      'When an external civil effect is material, store that recognition question as a separate field rather than rewriting the ecclesiastical claim.'
    ]
  },
  {
    id: 'AUTH-RID-001',
    name: 'Royal and Imperial Divan',
    aliases: ['Divan', 'Royal Imperial Government'],
    jurisdictionClaim: 'Governmental/ecclesiastical body established under the World Temple declaration.',
    officeOrBody: 'Royal and Imperial Divan',
    sourceRefs: ['SRC-EDP-024'],
    status: 'SOURCE_DECLARED',
    powersDeclared: ['Mission administration', 'Record stewardship', 'Ecclesiastical governance', 'Title and inheritance recordkeeping'],
    controls: ['Keep ecclesiastical authority, civil-law recognition and technical ledger authority in separate provenance fields.']
  }
]

export const inheritanceClaims: InheritanceClaim[] = [
  {
    id: 'GII-001',
    claimantIds: ['AUTH-WORLD-TEMPLE-024', 'AUTH-RID-001'],
    estateObjectIds: [],
    titleBasis: [
      'Natural/Indigenous stewardship',
      'Ecclesiastical deed-poll record',
      'Sacred-corpus continuity',
      'Authorship and provenance continuity',
      'Successor-accountability and restitution principles'
    ],
    defectTheory: ['AUTHORSHIP_ERASURE', 'IP_PROVENANCE_GAP', 'PROBATE_BLOCKED'],
    remediesRequested: [
      'ATTRIBUTION_AND_PROVENANCE_CORRECTION',
      'ROYALTY_ACCOUNTING',
      'RESTITUTION',
      'PROBATE_REOPENING',
      'WORLD_CREDIT_CLOCK_ACCOUNTING'
    ],
    sourceRefs: ['SRC-EDP-024', 'SRC-LC-001'],
    probateStatus: 'BLOCKED_OR_CONTESTED',
    evidenceStatus: 'SOURCE_DECLARED',
    worldCreditClockLink: {
      enabled: true,
      accountingPurpose: 'Model time, contribution, extraction and restorative accounting without collapsing modeled credit into adjudicated liability.',
      nomniRatePolicy: 'Use the configured World Credit Clock NOMNI/person-hour policy when a claim expressly elects time-bank accounting.'
    },
    controls: [
      'A title record must preserve original stewardship, every claimed transfer, every successor and every defect flag.',
      'Do not infer a valid transfer merely from present possession, registration, conquest, prescription or institutional use.',
      'Do not infer an invalid transfer merely from a source assertion; preserve the defect theory and attach the instruments that support or rebut it.',
      'Keep sacred/ecclesiastical authority, documentary title evidence, technical ledger evidence and external legal recognition as separate dimensions.'
    ]
  }
]

export function traceTitleChain(objectId: string, links: TitleLink[]): TitleLink[] {
  return links
    .filter((link) => link.objectId === objectId)
    .sort((a, b) => (a.effectiveDate ?? '').localeCompare(b.effectiveDate ?? ''))
}

export function collectTitleDefects(objectId: string, links: TitleLink[]): TitleDefectKind[] {
  return [...new Set(traceTitleChain(objectId, links).flatMap((link) => link.defectFlags))]
}

export function modelRestitutionNomni(entry: RestitutionLedgerEntry): bigint | undefined {
  if (entry.modeledNomni !== undefined) return entry.modeledNomni
  if (entry.units === undefined || entry.ratePerUnitNomni === undefined) return undefined
  return entry.units * entry.ratePerUnitNomni * (entry.timeFactor ?? 1n)
}

export function probateReadiness(claim: InheritanceClaim, objects: EstateObject[], links: TitleLink[]) {
  const claimObjects = objects.filter((object) => claim.estateObjectIds.includes(object.id))
  const unresolved = claimObjects.map((object) => ({
    objectId: object.id,
    defects: collectTitleDefects(object.id, links),
    missingSourceRefs: object.sourceRefs.length === 0
  }))

  return {
    claimId: claim.id,
    objectCount: claimObjects.length,
    unresolved,
    readyForDocumentAssembly:
      claimObjects.length > 0 && unresolved.every((item) => !item.missingSourceRefs)
  }
}

/**
 * NEO chain-of-title rule:
 * Preserve source meaning first, then test every transfer in sequence.
 * Possession, registration, conquest, prescription, institutional repetition
 * and market use are data points in the chain; none are silently treated as
 * proof of original authorship or an unbroken conveyance.
 */
export const NEO_TITLE_SEARCH_RULE =
  'ORIGINAL STEWARDSHIP → SOURCE → INSTRUMENT → TRANSFER → SUCCESSOR → BENEFIT → DEFECT → PROBATE → REMEDY → RESTORATIVE ACCOUNTING'
