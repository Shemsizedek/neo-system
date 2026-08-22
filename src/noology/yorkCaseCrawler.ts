import type { LearningObservation, LearningSource } from './continualLearning'

export const yorkCaseCrawlerSources: LearningSource[] = [
  {
    id: 'SRC-YORK-11CA-2005',
    title: 'United States v. Dwight D. York, 428 F.3d 1325 (11th Cir. 2005)',
    url: 'https://media.ca11.uscourts.gov/opinions/pub/files/200412354.pdf',
    sourceClass: 'EXTERNAL_REFERENCE',
    authorityScope: ['direct appeal','convictions','sentence','venue','grand jury','RICO','trial record summary'],
    mutable: false
  },
  {
    id: 'SRC-YORK-GOVINFO-2026',
    title: 'United States v. York — current M.D. Georgia docket documents',
    url: 'https://www.govinfo.gov/app/collection/USCOURTS',
    sourceClass: 'EXTERNAL_REFERENCE',
    authorityScope: ['post-conviction litigation','compassionate release','current federal docket documents'],
    mutable: true
  },
  {
    id: 'SRC-YORK-NUWAUBIANFACTS-DOCS',
    title: 'NuwaubianFacts Federal Criminal Case Documents',
    url: 'https://nuwaubianfacts.com/downloads.htm',
    sourceClass: 'EXTERNAL_REFERENCE',
    authorityScope: ['defense/community document archive','transcripts','motions','orders','2255 materials','counter-narrative'],
    mutable: true
  },
  {
    id: 'SRC-YORK-NUWAUBIANFACTS-SUMMARY',
    title: 'NuwaubianFacts York Case Narrative',
    url: 'https://www.nuwaubianfacts.com/summary1.htm',
    sourceClass: 'EXTERNAL_REFERENCE',
    authorityScope: ['community claims','persecution hypothesis','procedural objections','counter-narrative'],
    mutable: true
  },
  {
    id: 'SRC-YORK-JUSTIA-2023-CIVIL',
    title: 'York v. Macon County Police Department docket',
    url: 'https://dockets.justia.com/docket/georgia/gamdce/5%3A2023cv00488/131629',
    sourceClass: 'EXTERNAL_REFERENCE',
    authorityScope: ['later civil litigation','procedural history'],
    mutable: true
  }
]

export const yorkCaseSeedObservations: LearningObservation[] = [
  {
    id: 'OBS-YORK-001', sourceId: 'SRC-YORK-11CA-2005', title: 'Second superseding indictment and trial',
    statement: 'The Eleventh Circuit states that a second superseding indictment was returned on November 21, 2003 and formed the basis for York’s fourteen-day January 2004 trial.',
    tags: ['york','indictment','trial','primary-court-record'], locator: 'United States v. York, 428 F.3d 1325, background', observedAt: '2026-08-22T22:30:00Z', sourceStatus: 'CORROBORATED'
  },
  {
    id: 'OBS-YORK-002', sourceId: 'SRC-YORK-11CA-2005', title: 'Venue moved over fair-jury concerns',
    statement: 'The appellate opinion records that the district court granted York’s venue motion and expressed grave concerns about selecting a fair and impartial jury in the Macon and Atlanta media markets.',
    tags: ['york','venue','pretrial-publicity','fair-trial'], locator: 'United States v. York, venue discussion', observedAt: '2026-08-22T22:30:00Z', sourceStatus: 'CORROBORATED'
  },
  {
    id: 'OBS-YORK-003', sourceId: 'SRC-YORK-11CA-2005', title: 'Grand-jury prejudice argument rejected on appeal',
    statement: 'The appellate court rejected dismissal based on alleged grand-jury prejudice because the required legal showing of actual prejudice or substantial influence on the grand jury was not established on the record before it.',
    tags: ['york','grand-jury','prejudice','appeal'], locator: 'United States v. York, grand-jury issue', observedAt: '2026-08-22T22:30:00Z', sourceStatus: 'CORROBORATED'
  },
  {
    id: 'OBS-YORK-004', sourceId: 'SRC-YORK-11CA-2005', title: 'Conviction and sentence affirmed',
    statement: 'The Eleventh Circuit affirmed York’s convictions and 1,620-month sentence on direct appeal.',
    tags: ['york','conviction','sentence','appeal'], locator: 'United States v. York, opening and disposition', observedAt: '2026-08-22T22:30:00Z', sourceStatus: 'CORROBORATED'
  },
  {
    id: 'OBS-YORK-005', sourceId: 'SRC-YORK-NUWAUBIANFACTS-DOCS', title: 'Community archive preserves case materials',
    statement: 'NuwaubianFacts publicly indexes documents it identifies as pleadings, motions, transcripts, orders and post-conviction materials from federal criminal case 5:02-cr-00027-CAR.',
    tags: ['york','community-archive','transcripts','motions','2255'], locator: 'Federal Criminal Case downloads page', observedAt: '2026-08-22T22:30:00Z', sourceStatus: 'SOURCE_STATES'
  },
  {
    id: 'OBS-YORK-006', sourceId: 'SRC-YORK-NUWAUBIANFACTS-SUMMARY', title: 'Persecution and procedural-irregularity claims',
    statement: 'The community source alleges that the prosecution was targeted and raises objections involving superseding indictments, pretrial publicity, courtroom access, continuance requests and other procedures. These are preserved as claims requiring document-level verification.',
    tags: ['york','persecution-hypothesis','procedural-claims','counter-narrative'], locator: 'Case summary page', observedAt: '2026-08-22T22:30:00Z', sourceStatus: 'CONTESTED'
  },
  {
    id: 'OBS-YORK-007', sourceId: 'SRC-YORK-GOVINFO-2026', title: 'Post-conviction case activity continues',
    statement: 'A 2026 M.D. Georgia order reflects ongoing post-conviction litigation connected to a pending compassionate-release motion and counsel status.',
    tags: ['york','2026','post-conviction','compassionate-release'], locator: 'M.D. Ga. Case 5:02-cr-00027, Document 562, filed 2026-04-07', observedAt: '2026-08-22T22:30:00Z', sourceStatus: 'CORROBORATED'
  }
]

export const yorkCaseCrawlerPolicy = {
  id: 'NEO-YORK-CASE-CRAWLER',
  mode: 'EQUAL_SCRUTINY_LEGAL_RECORD_CRAWL',
  docket: '5:02-cr-00027-CAR',
  appellateCase: '04-12354',
  rules: [
    'Prefer signed court orders, opinions, docketed pleadings and authenticated transcripts over secondary summaries.',
    'Preserve prosecution claims, defense claims, community claims, judicial findings and media/advocacy labels as separate evidence classes.',
    'Trace repeated allegations to their earliest accessible root source and do not count dependent repetition as independent corroboration.',
    'A conviction or appellate affirmance establishes the legal disposition, not the truth of every statement made by every witness, advocate, journalist or institution.',
    'A defense or persecution allegation remains a claim until tied to specific record evidence, comparator evidence, communications, procedural rulings or other probative material.',
    'Record favorable, unfavorable and contradictory material with equal provenance requirements.',
    'Never infer motive solely from affiliation, race, religion, government employment, advocacy status or institutional identity.',
    'Queue sealed, unavailable or PACER-only documents as missing evidence rather than filling the gap from summaries.'
  ]
} as const
