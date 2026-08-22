export type NeopediaClaimStatus = 'SOURCE_STATES'|'CORROBORATED'|'NEO_SYNTHESIS'|'CONTESTED'|'OPEN_QUESTION'

export type NeopediaCitation = {
  sourceId: string
  locator: string
  claimStatus: NeopediaClaimStatus
}

export type NeopediaArticle = {
  id: string
  slug: string
  title: string
  summary: string
  body: string[]
  categories: string[]
  aliases: string[]
  citations: NeopediaCitation[]
  provenanceChain: string[]
  relatedArticleIds: string[]
  access: 'PUBLIC'|'RESEARCH'
  revision: number
}

export const neopedia = {
  id: 'NEOPEDIA',
  title: 'Neopedia',
  role: 'PROVENANCE_FIRST_ENCYCLOPEDIA',
  motto: 'Knowledge with lineage.',
  publicationRules: [
    'Every factual statement should be traceable to a source, record, or explicitly labeled synthesis.',
    'Do not flatten source doctrine, external scholarship, NEO synthesis and contested interpretations into one truth status.',
    'Preserve aliases, original terminology, dates, page locators and transmission history.',
    'Prefer primary records in NEO Hall when available.',
    'Keep revision history so later edits cannot erase earlier provenance.',
    'A popular interpretation does not outrank an earlier documented source merely because it is more widely repeated.'
  ]
} as const

export const neopediaSeedArticles: NeopediaArticle[] = [
  {
    id: 'NEOPEDIA-NOONE-ETHEREAL-ORDER', slug: 'noone-ethereal-order', title: 'Noone Ethereal Order',
    summary: 'An internal constitutional and sacred-order framework documented in the Constitutional Edict & Monitor Manual.',
    body: ['The Monitor identifies the Noone Ethereal Order and sets out articles addressing identity, purpose, membership, pyramids/chambers, officers, meetings, elections, ceremonies, rituals, initiations, degrees and studies.'],
    categories: ['NEO','Constitutions','Orders'], aliases: ['N.E.O.'],
    citations: [{sourceId:'LIB-MONITOR-001', locator:'pp.3-12, 30-50', claimStatus:'SOURCE_STATES'}],
    provenanceChain: ['Monitor Manual','Noone Ethereal Order'], relatedArticleIds: ['NEOPEDIA-PUPILS-OF-TUT','NEOPEDIA-PYRAMIDS-CHAMBERS'], access:'PUBLIC', revision:1
  },
  {
    id: 'NEOPEDIA-PUPILS-OF-TUT', slug: 'pupils-of-tut', title: 'Pupils of Tut',
    summary: 'A student/fraternal component described in the Monitor in connection with college study, Noone Science, scholarship, outreach and mentoring.',
    body: ['The Monitor presents Pupils of Tut as a student-oriented structure with obligations involving study, fraternity/sorority formation, scholarship, outreach, mentoring and development of professors of Noology.'],
    categories: ['Education','Noology','NEO'], aliases: [],
    citations: [{sourceId:'LIB-MONITOR-001', locator:'pp.7-12', claimStatus:'SOURCE_STATES'}],
    provenanceChain: ['Monitor Manual','Article 3','Pupils of Tut'], relatedArticleIds:['NEOPEDIA-NOONE-ETHEREAL-ORDER'], access:'PUBLIC', revision:1
  },
  {
    id: 'NEOPEDIA-PYRAMIDS-CHAMBERS', slug: 'pyramids-and-chambers', title: 'Pyramids and Chambers',
    summary: 'The Monitor’s distributed organizational model for local NEO activity, reporting, education and information gathering.',
    body: ['Article 4 describes Mir wa Thawunaat, Pyramids and Chambers, with local structures, regular reporting, classes and information-center functions.'],
    categories: ['Governance','Organization','NEO'], aliases:['Mir wa Thawunaat'],
    citations: [{sourceId:'LIB-MONITOR-001', locator:'pp.8-12', claimStatus:'SOURCE_STATES'}],
    provenanceChain: ['Monitor Manual','Article 4'], relatedArticleIds:['NEOPEDIA-NOONE-ETHEREAL-ORDER'], access:'PUBLIC', revision:1
  },
  {
    id: 'NEOPEDIA-NEO-DEGREES', slug: 'neo-degrees', title: 'NEO Degrees and Studies',
    summary: 'A structured initiation and study sequence documented in the Monitor.',
    body: ['The Monitor contains a Sacred Initiations Manual and degree list, including named temple degrees and a statement that the degree structure continues to 144 degrees.'],
    categories: ['Initiation','Education','Templist'], aliases:['Sacred Initiations Manual'],
    citations: [{sourceId:'LIB-MONITOR-001', locator:'pp.39-50', claimStatus:'SOURCE_STATES'}],
    provenanceChain: ['Monitor Manual','Sacred Initiations Manual'], relatedArticleIds:['NEOPEDIA-NOONE-ETHEREAL-ORDER'], access:'RESEARCH', revision:1
  }
]

export function searchNeopedia(query: string, articles: NeopediaArticle[] = neopediaSeedArticles) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  return articles.map(article => {
    const text = `${article.title} ${article.summary} ${article.aliases.join(' ')} ${article.categories.join(' ')} ${article.body.join(' ')}`.toLowerCase()
    const score = terms.reduce((sum, term) => sum + (article.title.toLowerCase().includes(term) ? 5 : 0) + (text.includes(term) ? 1 : 0), 0)
    return { article, score }
  }).filter(x => terms.length === 0 || x.score > 0).sort((a,b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
}
