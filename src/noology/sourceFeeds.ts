import type { LearningObservation, LearningSource } from './continualLearning'

export const neoLearningSources: LearningSource[] = [
  {
    id: 'SRC-HOLY-TABLETS-WEB',
    title: 'The Holy Tablets by Dr. Malachi Z. York',
    url: 'https://holytablets.nuwaubianfacts.com/',
    sourceClass: 'PRIMARY_SACRED',
    authorityScope: ['Holy Tablets','Nuwaubian doctrine','sacred terminology','chapter structure','receiver notes','prayer','glossary'],
    mutable: false,
    captureTyposAndVariants: true
  },
  {
    id: 'SRC-WORLD-TEMPLE-WEB',
    title: 'World Temple — Omniversal Church',
    url: 'https://holytemples.school.blog/',
    sourceClass: 'PRIMARY_INSTITUTIONAL',
    authorityScope: ['World Temple','NEO','Noocracy Papers','Holy Temple Canon','catechesis','liturgy','bulletins','ministries','institutional history'],
    mutable: true,
    captureTyposAndVariants: true
  }
]

export const sourceFeedSeedObservations: LearningObservation[] = [
  {
    id: 'OBS-HT-001', sourceId: 'SRC-HOLY-TABLETS-WEB', title: 'Holy Tablets Sacred Status',
    statement: 'The site presents The Holy Tablets as divinely inspired scripture for Nubian spiritual guidance and as a record-restoration text.',
    tags: ['holy-tablets','scripture','record-restoration','nubian'], locator: 'Home page introduction', observedAt: '2026-08-22T03:00:00Z', sourceStatus: 'SOURCE_STATES'
  },
  {
    id: 'OBS-HT-002', sourceId: 'SRC-HOLY-TABLETS-WEB', title: 'Holy Tablets Nineteen-Chapter Structure',
    statement: 'The table of contents lists nineteen chapters, from El Istakhlaag/The Creator through Al Khidr/Murduk.',
    tags: ['holy-tablets','19','chapters','structure'], locator: 'Table of Contents', observedAt: '2026-08-22T03:00:00Z', sourceStatus: 'SOURCE_STATES'
  },
  {
    id: 'OBS-WT-001', sourceId: 'SRC-WORLD-TEMPLE-WEB', title: 'World Temple Network and Branch Temple No. 24',
    statement: 'The site identifies the World Temple as an Omniversal Church/Nu Unified Temples network and identifies Branch Temple No. 24 of the Moorish Science Temple.',
    tags: ['world-temple','branch-24','omniversal-church','institution'], locator: 'Home page', observedAt: '2026-08-22T03:00:00Z', sourceStatus: 'SOURCE_STATES'
  },
  {
    id: 'OBS-WT-002', sourceId: 'SRC-WORLD-TEMPLE-WEB', title: 'World Temple Living Corpus',
    statement: 'The site publishes Noocracy Papers, Temple keys, bulletins, canon, catechesis, liturgy, history, ministries and library materials as an evolving institutional corpus.',
    tags: ['world-temple','noocracy','canon','catechesis','living-corpus'], locator: 'Home page and linked sections', observedAt: '2026-08-22T03:00:00Z', sourceStatus: 'SOURCE_STATES'
  }
]

export const sourceFeedPolicies = {
  holyTablets: {
    mode: 'SACRED_SOURCE_PRESERVATION',
    rules: ['Preserve chapter names and transliterations verbatim before normalization.','Store commentary as derivative records, never inside the protected source text.','Track cross-links to Enuma Elish, Gilgamesh, Etana, Anzu and other named tablets as source-stated relations until separately verified.']
  },
  worldTemple: {
    mode: 'LIVING_SITE_REVISION_CAPTURE',
    rules: ['Snapshot date, page title and source URL for every ingestion.','Preserve typos, variants and later corrections as revision history.','Distinguish institutional declarations from external legal recognition or factual corroboration.','Promote stable doctrine into Neopedia only with a preserved source locator.']
  }
} as const
