export type SacredRecordEvidenceClass =
  | 'SOURCE_STATEMENT'
  | 'SOURCE_SYMBOL'
  | 'SOURCE_METHOD'
  | 'SOURCE_HISTORICAL_CLAIM'

export type SacredRecordOperationalUse =
  | 'PROVENANCE'
  | 'FACTOLOGY'
  | 'HERMENEUTIC'
  | 'SYMBOLISM'
  | 'CHRONOLOGY'
  | 'CONSTITUTIONAL_GENEALOGY'

export type SacredRecordOfMoorsEntry = {
  id: string
  title: string
  summary: string
  evidenceClass: SacredRecordEvidenceClass
  operationalUses: SacredRecordOperationalUse[]
  source: {
    title: "Let's Set The Record Straight!"
    printedPage?: string
    pdfPage: number
    section?: string
  }
  sourceClaims: string[]
  tags: string[]
  controls: string[]
}

/**
 * Source-bound excerpts from "Let's Set The Record Straight!".
 *
 * The source identifies itself as an excerpt from "The Sacred Records Of The
 * Moor". Entries below preserve what the source says and how NEO Algo may use
 * it without silently promoting historical, biological, legal or scientific
 * claims to independently verified fact.
 */
export const sacredRecordsOfTheMoors: SacredRecordOfMoorsEntry[] = [
  {
    id: 'SRM-001',
    title: 'Set The Records Straight — Sacred Record Purpose',
    summary:
      'The introduction presents the work as an excerpt from "The Sacred Records Of The Moor" intended to recover overlooked history, ancestry, rights, sovereignty, reparations and record continuity.',
    evidenceClass: 'SOURCE_STATEMENT',
    operationalUses: ['PROVENANCE', 'HERMENEUTIC', 'CHRONOLOGY'],
    source: {
      title: "Let's Set The Record Straight!",
      printedPage: '1',
      pdfPage: 14,
      section: 'Introduction — This You Should Know!!'
    },
    sourceClaims: [
      'The scroll states that its purpose is to set the records straight.',
      'It identifies the larger source as "The Sacred Records Of The Moor" and calls the present work an excerpt.',
      'It frames knowledge of ancestry, sovereignty, rights and historical record as necessary to understanding the present.'
    ],
    tags: ['sacred-records', 'moors', 'record-straight', 'provenance', 'ancestry', 'sovereignty', 'rights', 'reparations'],
    controls: [
      'Preserve the source title, speaker/tradition and page context.',
      'Treat the source framing as internal documentary meaning, not automatic external legal recognition.'
    ]
  },
  {
    id: 'SRM-002',
    title: 'Document-Producing Factology',
    summary:
      'The introduction instructs readers to investigate names, identities and historical claims by producing records and ancient documents rather than relying only on attractive words or inherited labels.',
    evidenceClass: 'SOURCE_METHOD',
    operationalUses: ['FACTOLOGY', 'PROVENANCE', 'CHRONOLOGY'],
    source: {
      title: "Let's Set The Record Straight!",
      printedPage: '2–3',
      pdfPage: 15,
      section: 'Introduction / research method'
    },
    sourceClaims: [
      'The text urges readers to investigate names and identities and find charlatans, hypocrites and false claims through research.',
      'It says words that sound good should be tested by documents.',
      'It lists ancient documents, pictures, slabs, tablets, carvings, engravings, records, documents and scriptures as evidence types.'
    ],
    tags: ['factology', 'documents', 'evidence', 'research', 'provenance', 'records', 'check-it-out'],
    controls: [
      'NEO Algo should rank primary records, chronology and source provenance ahead of unsupported repetition.',
      'Absence of documentation should reduce evidence weight but should not erase a preserved source assertion.'
    ]
  },
  {
    id: 'SRM-003',
    title: 'Ancient Sacred Seal of the Moors',
    summary:
      'The source identifies an Ancient Sacred Seal of the Malians or Moors Mystical Order and describes an inverted crescent with a six-pointed star, alongside later fraternal and Islamic-order adaptations.',
    evidenceClass: 'SOURCE_SYMBOL',
    operationalUses: ['SYMBOLISM', 'PROVENANCE', 'HERMENEUTIC'],
    source: {
      title: "Let's Set The Record Straight!",
      printedPage: '113',
      pdfPage: 126,
      section: 'What Is The Ancient Sacred Seal Of The Moors?'
    },
    sourceClaims: [
      'The source names the emblem the Ancient Sacred Seal of the Malians or Moors Mystical Order.',
      'It describes an inverted crescent and six-pointed star.',
      'It states that versions were adopted by the Alhambra Order, Islamic Order of the Knights of Columbus, the Nobles of the Mystic Shrine and Freemasons.'
    ],
    tags: ['sacred-seal', 'moors', 'malians', 'crescent', 'six-pointed-star', 'symbolism', 'fraternal-orders'],
    controls: [
      'Use symbols as provenance and hermeneutic metadata; do not infer organizational identity or membership from visual similarity alone.',
      'When comparing emblems, preserve dates, source communities and modification history.'
    ]
  },
  {
    id: 'SRM-004',
    title: 'Five P Framework',
    summary:
      'The source associates the five points of a later five-pointed star with Politics, Psychology, Philosophy, Polytheism and Penal System.',
    evidenceClass: 'SOURCE_SYMBOL',
    operationalUses: ['SYMBOLISM', 'HERMENEUTIC'],
    source: {
      title: "Let's Set The Record Straight!",
      printedPage: '114',
      pdfPage: 127,
      section: 'The Five P’s'
    },
    sourceClaims: [
      'The source lists five interpretive domains: Politics, Psychology, Philosophy, Polytheism and Penal System.',
      'It presents them as symbolic points in a fraternal/constitutional discussion.'
    ],
    tags: ['five-p', 'politics', 'psychology', 'philosophy', 'polytheism', 'penal-system', 'symbolism'],
    controls: [
      'Use the Five P framework as a source-derived diagnostic lens, not as proof of hidden institutional control.',
      'Require documentary linkage before attributing a symbol or institution to the framework.'
    ]
  },
  {
    id: 'SRM-005',
    title: 'Iroquois Constitutional Genealogy Claim',
    summary:
      'The source argues that the United States Constitution was patterned on or plagiarized from the Iroquois oral constitution and Great Law of Peace.',
    evidenceClass: 'SOURCE_HISTORICAL_CLAIM',
    operationalUses: ['CONSTITUTIONAL_GENEALOGY', 'FACTOLOGY', 'CHRONOLOGY'],
    source: {
      title: "Let's Set The Record Straight!",
      printedPage: '115–117',
      pdfPage: 128,
      section: 'Original Constitution / Great Law of Peace'
    },
    sourceClaims: [
      'The source states that the United States Constitution was plagiarized from the Iroquois Kayenhla Kowa / Great Law of Peace.',
      'It says the Iroquois oral constitution pre-dated the United States Constitution by centuries.',
      'It names the Six Nations and discusses governance by women/matrons in its account.'
    ],
    tags: ['iroquois', 'great-law-of-peace', 'constitution', 'indigenous-law', 'genealogy', 'factology', 'succession'],
    controls: [
      'Store this as a source historical claim and route it to comparative constitutional research when verification is requested.',
      'Separate source assertion, documentary parallels, influence evidence and legal consequence into distinct fields.'
    ]
  }
]

export const sacredRecordById = (id: string) =>
  sacredRecordsOfTheMoors.find((entry) => entry.id === id)

export const sacredRecordsByTag = (tag: string) =>
  sacredRecordsOfTheMoors.filter((entry) => entry.tags.includes(tag))
