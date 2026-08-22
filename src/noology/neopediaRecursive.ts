import { neoDoctrineRegistry } from './doctrineRegistry'
import { neoMaxims } from './maxims'
import { sacredRecordsGraphNodes } from './sacredRecordsKnowledgeGraph'
import { sacredRecordsOfTheMoors } from './sacredRecordsMoors'
import { templistTeachings } from './templistDoctrine'
import { nooneProject } from './nooneProjectRoot'
import { novusCodexDoctrineRecords } from './novusCodexDoctrine'
import { monitorSourceRecords } from './monitorConstitution'
import { ecclesiasticalAuthorities, inheritanceClaims, inheritanceSources, sacredCorpus } from './globalInheritanceTitleSchema'
import { secretSocietiesUnmaskedSourceRecords } from './counterInfluenceIntelligence'
import { destinyProtectionMaxims, destinyDoctrineRecords } from './destinyProvenanceDefense'
import { neopediaSeedArticles, type NeopediaArticle, type NeopediaClaimStatus } from './neopedia'

export type RecursiveNeopediaSourceClass =
  | 'NEO_DOCTRINE'
  | 'NEO_MAXIM'
  | 'SACRED_RECORD'
  | 'KNOWLEDGE_GRAPH'
  | 'TEMPLIST'
  | 'NOONE_PROJECT'
  | 'NOVUS_CODEX'
  | 'MONITOR'
  | 'TITLE_INHERITANCE'
  | 'COUNTER_INFLUENCE'
  | 'DESTINY_PROVENANCE'
  | 'WORLD_CREDIT_CLOCK'

export type RecursiveNeopediaArticle = NeopediaArticle & {
  sourceClass: RecursiveNeopediaSourceClass
  sourceObjectId: string
  generated: true
  syncStatus: 'SYNCED'|'REVIEW_REQUIRED'
}

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const record = (value: unknown) => (value && typeof value === 'object' ? value as Record<string, unknown> : {})
const str = (r: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) if (typeof r[key] === 'string' && r[key]) return r[key] as string
  return ''
}
const arr = (r: Record<string, unknown>, key: string) => Array.isArray(r[key]) ? (r[key] as unknown[]).map(String) : []
const sourceRefs = (r: Record<string, unknown>) => {
  const direct = arr(r, 'sourceRefs')
  if (direct.length) return direct
  const source = record(r.source)
  const title = str(source, 'title')
  const locator = str(source, 'pageOrSection', 'locator')
  return title ? [`${title}${locator ? ` — ${locator}` : ''}`] : []
}
const statusFrom = (r: Record<string, unknown>): NeopediaClaimStatus => {
  const raw = str(r, 'evidenceClass', 'status', 'provenanceClass').toUpperCase()
  if (raw.includes('CORROBORATED')) return 'CORROBORATED'
  if (raw.includes('CONTESTED')) return 'CONTESTED'
  if (raw.includes('OPEN')) return 'OPEN_QUESTION'
  if (raw.includes('SYNTHESIS') || raw.includes('MAXIM')) return 'NEO_SYNTHESIS'
  return 'SOURCE_STATES'
}
function toArticle(value: unknown, sourceClass: RecursiveNeopediaSourceClass, fallbackTitle: string, categories: string[], access: 'PUBLIC'|'RESEARCH' = 'PUBLIC'): RecursiveNeopediaArticle {
  const r = record(value)
  const id = str(r, 'id') || `${sourceClass}-${slugify(fallbackTitle)}`
  const title = str(r, 'title', 'name', 'canonicalName') || fallbackTitle
  const summary = str(r, 'summary', 'teaching', 'statement', 'role', 'definition', 'sourceStatement') || `NEO knowledge record for ${title}.`
  const aliases = arr(r, 'aliases')
  const tags = arr(r, 'tags')
  const refs = sourceRefs(r)
  const claimStatus = statusFrom(r)
  return {
    id: `NEOPEDIA-${id}`,
    slug: slugify(title),
    title,
    summary,
    body: [summary],
    categories: [...new Set([...categories, ...tags])],
    aliases,
    citations: refs.map(locator => ({ sourceId: id, locator, claimStatus })),
    provenanceChain: [...new Set([sourceClass, ...refs])],
    relatedArticleIds: [],
    access,
    revision: 1,
    sourceClass,
    sourceObjectId: id,
    generated: true,
    syncStatus: refs.length || claimStatus === 'NEO_SYNTHESIS' ? 'SYNCED' : 'REVIEW_REQUIRED'
  }
}

const generated: RecursiveNeopediaArticle[] = [
  ...neoDoctrineRegistry.map(x => toArticle(x, 'NEO_DOCTRINE', 'NEO Doctrine', ['Noology','Doctrine'])),
  ...neoMaxims.map(x => toArticle(x, 'NEO_MAXIM', 'NEO Maxim', ['NEO Maxims','Philosophy'])),
  ...sacredRecordsOfTheMoors.map(x => toArticle(x, 'SACRED_RECORD', 'Sacred Record', ['Sacred Records','Factology'], 'RESEARCH')),
  ...sacredRecordsGraphNodes.map(x => toArticle(x, 'KNOWLEDGE_GRAPH', 'Sacred Records Graph Node', ['Knowledge Graph','History'], 'RESEARCH')),
  ...templistTeachings.map(x => toArticle(x, 'TEMPLIST', 'Templist Teaching', ['Templist','Practice'], 'RESEARCH')),
  ...nooneProject.nodes.map(x => toArticle(x, 'NOONE_PROJECT', 'Noone Project Node', ['Noone Project','Projects'])),
  ...novusCodexDoctrineRecords.map(x => toArticle(x, 'NOVUS_CODEX', 'Novus Codex Record', ['Novus Codex','Noology'], 'RESEARCH')),
  ...monitorSourceRecords.map(x => toArticle(x, 'MONITOR', 'Monitor Record', ['Monitor','Constitution'], 'RESEARCH')),
  ...inheritanceSources.map(x => toArticle(x, 'TITLE_INHERITANCE', 'Inheritance Source', ['Law & Title','Provenance'], 'RESEARCH')),
  ...ecclesiasticalAuthorities.map(x => toArticle(x, 'TITLE_INHERITANCE', 'Ecclesiastical Authority', ['Ecclesiastical','Law & Title'], 'RESEARCH')),
  ...sacredCorpus.map(x => toArticle(x, 'TITLE_INHERITANCE', 'Sacred Corpus Record', ['Sacred Corpus','Law & Title'], 'RESEARCH')),
  ...inheritanceClaims.map(x => toArticle(x, 'TITLE_INHERITANCE', 'Inheritance Claim', ['Inheritance','Probate','Restitution'], 'RESEARCH')),
  ...secretSocietiesUnmaskedSourceRecords.map(x => toArticle(x, 'COUNTER_INFLUENCE', 'Counter-Influence Record', ['Counter-Influence'], 'RESEARCH')),
  ...destinyDoctrineRecords.map(x => toArticle(x, 'DESTINY_PROVENANCE', 'Destiny Provenance Doctrine', ['Destiny Provenance','Protection'], 'RESEARCH')),
  ...destinyProtectionMaxims.map((x, i) => toArticle({ id: `DESTINY-MAXIM-${i+1}`, title: `Destiny Provenance Maxim ${i+1}`, statement: x }, 'DESTINY_PROVENANCE', `Destiny Provenance Maxim ${i+1}`, ['Destiny Provenance','NEO Maxims']))
]

const worldCreditClockArticles: RecursiveNeopediaArticle[] = [
  toArticle({
    id: 'WORLD-CREDIT-CLOCK', title: 'World Credit Clock', aliases: ['Clock of Destiny','Cloak of Destiny'],
    summary: 'NEO mutual-credit time model that calculates modeled NOMNI generation from population, the 33 NOMNI person-hour rate, and elapsed whole hours, while optionally synchronizing Temple Calendar context.',
    sourceRefs: ['src/noology/worldCreditClock.ts'], tags: ['NOMNI','mutual-credit','time-bank','population','33-nomni']
  }, 'WORLD_CREDIT_CLOCK', 'World Credit Clock', ['Economy & Credit','Time & Calendar']),
  toArticle({
    id: 'WORLD-CREDIT-RATE', title: '33 NOMNI Per Person-Hour',
    summary: 'The default internal World Credit Clock rate is 33 NOMNI per person-hour. The clock model keeps this quantity distinct from fiat valuation, legal debt, market capitalization, or receivables.',
    sourceRefs: ['src/noology/worldCreditClock.ts'], tags: ['NOMNI','33','person-hour','accounting-boundary']
  }, 'WORLD_CREDIT_CLOCK', '33 NOMNI Per Person-Hour', ['Economy & Credit'])
]

export const recursiveNeopediaArticles: RecursiveNeopediaArticle[] = [...generated, ...worldCreditClockArticles]

export const allNeopediaArticles: NeopediaArticle[] = [
  ...neopediaSeedArticles,
  ...recursiveNeopediaArticles.filter(article => !neopediaSeedArticles.some(seed => seed.slug === article.slug))
]

export function linkRecursiveNeopedia(articles: RecursiveNeopediaArticle[] = recursiveNeopediaArticles): RecursiveNeopediaArticle[] {
  const byCategory = new Map<string, RecursiveNeopediaArticle[]>()
  for (const article of articles) for (const category of article.categories) {
    const list = byCategory.get(category) ?? []
    list.push(article)
    byCategory.set(category, list)
  }
  return articles.map(article => {
    const related = new Set<string>()
    for (const category of article.categories) for (const peer of byCategory.get(category) ?? []) {
      if (peer.id !== article.id && related.size < 12) related.add(peer.id)
    }
    return { ...article, relatedArticleIds: [...related] }
  })
}

export function recursiveNeopediaStats() {
  const linked = linkRecursiveNeopedia()
  return {
    generatedArticles: linked.length,
    totalArticles: neopediaSeedArticles.length + linked.length,
    reviewRequired: linked.filter(x => x.syncStatus === 'REVIEW_REQUIRED').length,
    bySourceClass: linked.reduce<Record<string, number>>((acc, article) => {
      acc[article.sourceClass] = (acc[article.sourceClass] ?? 0) + 1
      return acc
    }, {})
  }
}
