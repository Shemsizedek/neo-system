export type NeoHallCollection = 'CONSTITUTIONS'|'SACRED_RECORDS'|'NOOLOGY'|'FACTOLOGY'|'HISTORY'|'LAW_AND_TITLE'|'TIME_AND_CALENDAR'|'ECONOMY_AND_CREDIT'|'TEMPLIST'|'PROJECTS'|'COUNTER_INFLUENCE'|'ARCHIVES'

export type NeoLibraryItem = {
  id: string
  title: string
  collection: NeoHallCollection
  sourceType: 'PRIMARY'|'DERIVATIVE'|'EXTERNAL'|'NEO_SYNTHESIS'
  provenance: string[]
  sourceRefs: string[]
  tags: string[]
  access: 'PUBLIC'|'RESEARCH'|'SACRED_RESTRICTED'
  status: 'INGESTED'|'INDEXED'|'REVIEW_REQUIRED'|'DRAFT'
  summary?: string
}

export const neoHall = {
  id: 'NEO-HALL',
  title: 'NEO Hall',
  subtitle: 'Hall of Knowledge, Records, Memory and Provenance',
  publicRole: 'PUBLIC_KNOWLEDGE_INSTITUTION',
  repositoryRole: 'NEO_LIBRARY',
  principle: 'Preserve the record before interpreting the record.',
  collections: ['CONSTITUTIONS','SACRED_RECORDS','NOOLOGY','FACTOLOGY','HISTORY','LAW_AND_TITLE','TIME_AND_CALENDAR','ECONOMY_AND_CREDIT','TEMPLIST','PROJECTS','COUNTER_INFLUENCE','ARCHIVES'] as NeoHallCollection[]
} as const

export const neoLibrarySeed: NeoLibraryItem[] = [
  {
    id: 'LIB-MONITOR-001', title: 'Noone Ethereal Order Constitutional Edict & Monitor Manual', collection: 'CONSTITUTIONS', sourceType: 'PRIMARY',
    provenance: ['Noone Ethereal Order','Constitutional Edict & Monitor'], sourceRefs: ['Monitor Manual — 151 pages'], tags: ['neo','monitor','constitution','ritual','degrees'], access: 'RESEARCH', status: 'INDEXED'
  },
  {
    id: 'LIB-NOONE-PROJECT-001', title: 'The Noone Project', collection: 'PROJECTS', sourceType: 'PRIMARY', provenance: ['Noone Project'], sourceRefs: ['Foundational master blueprint'], tags: ['project-of-projects','noone-project'], access: 'PUBLIC', status: 'INDEXED'
  },
  {
    id: 'LIB-TEMPLIST-001', title: 'The Templist Scroll', collection: 'TEMPLIST', sourceType: 'PRIMARY', provenance: ['Templist doctrine'], sourceRefs: ['Templist Scroll'], tags: ['templist','ethic-9','19x19'], access: 'RESEARCH', status: 'INDEXED'
  },
  {
    id: 'LIB-SACRED-MOORS-001', title: 'Sacred Records of the Moors / Let’s Set The Record Straight!', collection: 'SACRED_RECORDS', sourceType: 'PRIMARY', provenance: ['Sacred Records of the Moors'], sourceRefs: ["Let's Set The Record Straight!"], tags: ['moors','factology','records','symbols'], access: 'RESEARCH', status: 'INDEXED'
  },
  {
    id: 'LIB-SECRET-SOCIETIES-001', title: 'Secret Societies Unmasked', collection: 'COUNTER_INFLUENCE', sourceType: 'PRIMARY', provenance: ['Nuwaubian source corpus'], sourceRefs: ['Secret Societies Unmasked'], tags: ['counter-influence','organizations','oaths','symbols'], access: 'RESEARCH', status: 'INDEXED'
  }
]

export function findNeoHallItems(query: string, items: NeoLibraryItem[] = neoLibrarySeed) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  return items.filter(item => {
    const haystack = `${item.title} ${item.collection} ${item.tags.join(' ')} ${item.provenance.join(' ')}`.toLowerCase()
    return terms.every(term => haystack.includes(term))
  })
}
