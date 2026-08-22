export type ResearchDomain =
  | 'NEO_LIBRARY'
  | 'SACRED_CORPUS'
  | 'LAW_AND_TITLE'
  | 'FINANCE_AND_CREDIT'
  | 'BLOCKCHAIN'
  | 'CORPORATE_AND_FILINGS'
  | 'IP_AND_PATENTS'
  | 'HISTORY_AND_ARCHIVES'
  | 'SCIENCE_AND_NATURE'
  | 'MEDIA_AND_PUBLIC_RECORD'
  | 'GOVERNMENT_AND_REGULATORY'
  | 'GENEALOGY_AND_SUCCESSION'
  | 'GENERAL_WEB'

export type SourceAuthorityTier = 'TIER_1_PRIMARY'|'TIER_2_AUTHORITATIVE'|'TIER_3_SECONDARY'|'TIER_4_LEAD'

export type ResearchProviderKind =
  | 'NEO_INTERNAL'
  | 'APPROVED_SITE'
  | 'LAW_LIBRARY'
  | 'REGULATOR'
  | 'BLOCKCHAIN_EXPLORER'
  | 'FINANCIAL_DATA'
  | 'CORPORATE_REGISTRY'
  | 'PATENT_REGISTRY'
  | 'ARCHIVE'
  | 'SCIENTIFIC_DATABASE'
  | 'NEWS_MEDIA'
  | 'GENERAL_SEARCH'

export type ResearchRoute = {
  domain: ResearchDomain
  confidence: number
  rationale: string
  preferredProviders: ResearchProviderKind[]
  authorityOrder: SourceAuthorityTier[]
  requiredChecks: string[]
}

export type RoutedResearchQuestion = {
  question: string
  routes: ResearchRoute[]
  primaryRoute: ResearchRoute
  crossDomain: boolean
}

const DOMAIN_RULES: Array<{ domain: ResearchDomain; terms: string[]; providers: ResearchProviderKind[]; checks: string[] }> = [
  { domain: 'LAW_AND_TITLE', terms: ['law','legal','title','deed','probate','ucc','lien','jurisdiction','court','statute','case','treaty','trust','estate','inheritance','restitution'], providers: ['LAW_LIBRARY','REGULATOR','NEO_INTERNAL'], checks: ['current law','jurisdiction','chain of title','instrument authenticity','contrary authority'] },
  { domain: 'FINANCE_AND_CREDIT', terms: ['finance','credit','debt','nomni','facility','market cap','supply','valuation','bank','securities','offering','investment','fund'], providers: ['FINANCIAL_DATA','REGULATOR','NEO_INTERNAL'], checks: ['instrument identity','valuation basis','date sensitivity','regulatory status','accounting boundary'] },
  { domain: 'BLOCKCHAIN', terms: ['bitcoin','btc','blockchain','wallet','address','token','asset','counterparty','xcp','issuance','transaction','txid'], providers: ['BLOCKCHAIN_EXPLORER','NEO_INTERNAL'], checks: ['chain/network','asset issuer','transaction provenance','address continuity','on-chain vs off-chain claim'] },
  { domain: 'CORPORATE_AND_FILINGS', terms: ['company','corporation','llc','sec','edgar','form d','filing','director','beneficial owner','subsidiary','successor company'], providers: ['REGULATOR','CORPORATE_REGISTRY','NEO_INTERNAL'], checks: ['entity resolution','filing date','successor relationships','ownership/control','official record vs commentary'] },
  { domain: 'IP_AND_PATENTS', terms: ['patent','copyright','trademark','intellectual property','ip','author','inventor','royalty','license','plagiarism','appropriation'], providers: ['PATENT_REGISTRY','LAW_LIBRARY','NEO_INTERNAL'], checks: ['originator vs registrant','priority date','assignment chain','scope of rights','public-domain status'] },
  { domain: 'SACRED_CORPUS', terms: ['holy tablets','scripture','temple','noology','noone','noopoo','nuwaub','qur','torah','suhuf','hikmah','zabuwr','barnabas','revelation'], providers: ['NEO_INTERNAL','APPROVED_SITE','ARCHIVE'], checks: ['preserve source wording','edition/version','translation/transliteration','source doctrine vs external verification','restricted-access boundary'] },
  { domain: 'HISTORY_AND_ARCHIVES', terms: ['history','ancient','archive','chronology','roman','egypt','sumer','moor','moors','indigenous','colonial','discovery','migration'], providers: ['ARCHIVE','NEO_INTERNAL','GENERAL_SEARCH'], checks: ['chronology','primary record','provenance','anachronism','competing historiography'] },
  { domain: 'GENEALOGY_AND_SUCCESSION', terms: ['genealogy','lineage','ancestor','descendant','succession','heir','family','tribe','nation','predecessor'], providers: ['ARCHIVE','CORPORATE_REGISTRY','NEO_INTERNAL'], checks: ['identity resolution','dated links','documented succession','name variants','avoid inference from symbolism alone'] },
  { domain: 'SCIENCE_AND_NATURE', terms: ['science','nature','biology','physics','astronomy','sirius','solar','lunar','ecology','environment','ether','cycle'], providers: ['SCIENTIFIC_DATABASE','NEO_INTERNAL','GENERAL_SEARCH'], checks: ['observation vs doctrine','measurement','replicability','current consensus','unresolved hypotheses'] },
  { domain: 'GOVERNMENT_AND_REGULATORY', terms: ['government','regulation','agency','federal','state','municipal','vatican','united nations','imf','world bank','ordinance','regulator'], providers: ['REGULATOR','LAW_LIBRARY','ARCHIVE'], checks: ['official authority','effective date','scope','legal effect','implementation status'] },
  { domain: 'MEDIA_AND_PUBLIC_RECORD', terms: ['news','media','article','documentary','video','interview','press','statement','public record'], providers: ['NEWS_MEDIA','ARCHIVE','GENERAL_SEARCH'], checks: ['publication date','original source','quotation context','corroboration','editorial vs factual claim'] }
]

const AUTHORITY_ORDER: SourceAuthorityTier[] = ['TIER_1_PRIMARY','TIER_2_AUTHORITATIVE','TIER_3_SECONDARY','TIER_4_LEAD']

function scoreTerms(text: string, terms: string[]) {
  const lower = text.toLowerCase()
  return terms.reduce((score, term) => score + (lower.includes(term) ? (term.includes(' ') ? 2 : 1) : 0), 0)
}

export function routeResearchQuestion(question: string): RoutedResearchQuestion {
  const scored = DOMAIN_RULES
    .map(rule => ({ rule, score: scoreTerms(question, rule.terms) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const max = scored[0]?.score ?? 0
  const routes: ResearchRoute[] = scored.slice(0, 5).map(({ rule, score }) => ({
    domain: rule.domain,
    confidence: Math.min(0.99, 0.45 + (max ? score / (max * 2) : 0)),
    rationale: `Matched domain terminology relevant to ${rule.domain.replaceAll('_',' ').toLowerCase()}.`,
    preferredProviders: rule.providers,
    authorityOrder: AUTHORITY_ORDER,
    requiredChecks: rule.checks
  }))

  if (!routes.length) routes.push({
    domain: 'GENERAL_WEB',
    confidence: 0.5,
    rationale: 'No specialized domain dominated the question; begin broad and refine after entity extraction.',
    preferredProviders: ['NEO_INTERNAL','GENERAL_SEARCH'],
    authorityOrder: AUTHORITY_ORDER,
    requiredChecks: ['entity resolution','primary-source discovery','date sensitivity','contrary evidence','provenance']
  })

  if (!routes.some(route => route.domain === 'NEO_LIBRARY')) routes.push({
    domain: 'NEO_LIBRARY',
    confidence: 0.8,
    rationale: 'NEO Library is always checked for prior doctrine, provenance, terminology and existing graph relationships.',
    preferredProviders: ['NEO_INTERNAL'],
    authorityOrder: AUTHORITY_ORDER,
    requiredChecks: ['source class','revision history','existing contradictions','aliases','prior NEO synthesis']
  })

  return {
    question,
    routes,
    primaryRoute: routes[0],
    crossDomain: routes.filter(route => route.domain !== 'NEO_LIBRARY').length > 1
  }
}

export type RetrievalAdapter = {
  id: string
  provider: ResearchProviderKind
  domains: ResearchDomain[]
  canHandle: (route: ResearchRoute) => boolean
}

export function chooseResearchAdapters(route: ResearchRoute, adapters: RetrievalAdapter[]) {
  return adapters
    .filter(adapter => adapter.canHandle(route) || adapter.domains.includes(route.domain))
    .sort((a, b) => route.preferredProviders.indexOf(a.provider) - route.preferredProviders.indexOf(b.provider))
}

export const neoResearchRouter = {
  id: 'NEO-RESEARCH-ROUTER',
  title: 'NEO Research Router',
  role: 'DOMAIN_CLASSIFICATION_SOURCE_ROUTING_AND_AUTHORITY_PRIORITY',
  authorityPrinciple: 'Primary evidence outranks commentary for what the primary record itself can establish; no source is permitted to exceed its actual scope.',
  routingPrinciples: [
    'Route by question content, not by desired conclusion.',
    'Check NEO Library for provenance and prior doctrine on every inquiry.',
    'Prefer primary records and authoritative registries before commentary when the question is document-verifiable.',
    'Use multiple domains when the inquiry crosses law, finance, history, science, sacred doctrine, blockchain or institutional records.',
    'Preserve source doctrine and external verification as distinct lanes.',
    'A routing score identifies where to investigate; it does not determine truth.'
  ] as const
} as const
