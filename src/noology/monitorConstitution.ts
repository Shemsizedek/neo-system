export type MonitorSourceRecord = {
  id: string
  title: string
  article?: string
  pages: number[]
  summary: string
  tags: string[]
  provenance: 'SOURCE_DERIVED'
}

export const monitorSource = {
  id: 'NEO-MONITOR',
  title: 'Noone Ethereal Order Constitutional Edict & Monitor Manual',
  role: 'CONSTITUTIONAL_MONITOR',
  sourceType: 'SACRED_RITUAL_MONITOR',
  totalPages: 151,
  provenance: 'SOURCE_DERIVED'
} as const

export const monitorSourceRecords: MonitorSourceRecord[] = [
  {
    id: 'MONITOR-ARTICLE-1',
    title: 'Article 1 — Name and Order Identity',
    article: 'Article 1',
    pages: [3, 4],
    summary: 'Defines the Noone Ethereal Order and its named subdivisions and establishes constitutional identity and internal-order boundaries.',
    tags: ['constitution','identity','order','provenance'],
    provenance: 'SOURCE_DERIVED'
  },
  {
    id: 'MONITOR-ARTICLE-2',
    title: 'Article 2 — Purpose',
    article: 'Article 2',
    pages: [4, 5],
    summary: 'States the Order purpose around organized service, brotherhood/sisterhood, knowledge, moral and spiritual development, and practical support for humanity.',
    tags: ['purpose','service','knowledge','humanity'],
    provenance: 'SOURCE_DERIVED'
  },
  {
    id: 'MONITOR-ARTICLE-3',
    title: 'Article 3 — Membership',
    article: 'Article 3',
    pages: [5, 6, 7, 8],
    summary: 'Defines active and inactive membership expectations, participation, study, conduct, chapters, qualifications, applications, and Pupils of Tut.',
    tags: ['membership','study','conduct','pupils-of-tut'],
    provenance: 'SOURCE_DERIVED'
  },
  {
    id: 'MONITOR-ARTICLE-4',
    title: 'Article 4 — Mir wa Thawunaat / Pyramids and Chambers',
    article: 'Article 4',
    pages: [8, 9, 10, 11, 12],
    summary: 'Defines a distributed Pyramid/Chamber structure, reporting rhythm, classes, local information centers, and network-building functions.',
    tags: ['pyramid','chamber','governance','network','reporting'],
    provenance: 'SOURCE_DERIVED'
  },
  {
    id: 'MONITOR-ARTICLE-9',
    title: 'Article 9 — Ceremonies and Rituals',
    article: 'Article 9',
    pages: [30, 31, 32],
    summary: 'Defines ceremonial and ritual principles, including meditation, explanation, patience, endurance, temperance, modesty, kindness, and member affirmations.',
    tags: ['ritual','meditation','ethics','affirmations','discipline'],
    provenance: 'SOURCE_DERIVED'
  },
  {
    id: 'MONITOR-SACRED-INITIATIONS',
    title: 'Sacred Initiations Manual, Levels, Degrees, and Studies',
    pages: [39, 40, 41, 42, 43, 47, 48, 50],
    summary: 'Provides a structured initiation/study system, temple tools, named study levels, a degree sequence, and a celestial hierarchy.',
    tags: ['initiation','degrees','studies','temple-tools','hierarchy'],
    provenance: 'SOURCE_DERIVED'
  }
]

export const monitorControls = [
  'Constitutional source outranks later summaries when interpreting internal NEO governance terminology.',
  'Preserve article, page, office, degree and ritual provenance when creating derivative knowledge records.',
  'Separate public educational summaries from sacred or access-restricted material where the source marks material as sacred.',
  'Do not infer external legal authority from internal constitutional language; represent jurisdictional claims as source-defined claims unless independently established.',
  'Every derivative Neopedia entry must retain source lineage and revision history.'
] as const
