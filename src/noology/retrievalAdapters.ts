import type { ResearchDomain, ResearchProviderKind, ResearchRoute, SourceAuthorityTier } from './researchRouter'

export type RetrievalRequest = {
  query: string
  route: ResearchRoute
  identifiers?: Record<string, string>
  limit?: number
}

export type RetrievalHit = {
  providerId: string
  provider: ResearchProviderKind
  domain: ResearchDomain
  authorityTier: SourceAuthorityTier
  title: string
  url: string
  locator?: string
  date?: string
  statement?: string
  identifiers?: Record<string, string>
  metadata?: Record<string, unknown>
}

export type RetrievalResponse = {
  providerId: string
  request: RetrievalRequest
  hits: RetrievalHit[]
  warnings: string[]
  retrievedAt: string
}

export type RetrievalTransport = (url: string, init?: RequestInit) => Promise<Response>

export type ExecutableRetrievalAdapter = {
  id: string
  provider: ResearchProviderKind
  domains: ResearchDomain[]
  authorityTier: SourceAuthorityTier
  description: string
  canHandle: (request: RetrievalRequest) => boolean
  buildUrl: (request: RetrievalRequest) => string
  parse: (payload: unknown, request: RetrievalRequest) => RetrievalHit[]
}

const enc = encodeURIComponent
const text = (v: unknown) => typeof v === 'string' ? v : ''
const arr = (v: unknown) => Array.isArray(v) ? v : []

export const retrievalAdapters: ExecutableRetrievalAdapter[] = [
  {
    id: 'SEC-EDGAR', provider: 'REGULATOR', domains: ['CORPORATE_AND_FILINGS','FINANCE_AND_CREDIT','GOVERNMENT_AND_REGULATORY'], authorityTier: 'TIER_1_PRIMARY',
    description: 'SEC EDGAR submissions/search lane for issuer filings and offering records.',
    canHandle: r => r.route.preferredProviders.includes('REGULATOR'),
    buildUrl: r => `https://efts.sec.gov/LATEST/search-index?q=${enc(r.query)}&dateRange=custom&startdt=1900-01-01&enddt=2099-12-31&from=0&size=${Math.min(r.limit ?? 20,100)}`,
    parse: (p, r) => arr((p as any)?.hits?.hits).map((h:any) => ({ providerId:'SEC-EDGAR', provider:'REGULATOR', domain:r.route.domain, authorityTier:'TIER_1_PRIMARY', title:text(h?._source?.file_description)||text(h?._source?.display_names?.[0])||'SEC filing', url:h?._id?`https://www.sec.gov/Archives/edgar/data/${String(h._id).replace(/-/g,'')}`:'https://www.sec.gov/edgar/search/', date:text(h?._source?.file_date), identifiers:{accession:text(h?._source?.adsh), cik:text(h?._source?.ciks?.[0])}, metadata:h?._source ?? {} }))
  },
  {
    id: 'COURTLISTENER', provider: 'LAW_LIBRARY', domains: ['LAW_AND_TITLE','GOVERNMENT_AND_REGULATORY'], authorityTier: 'TIER_2_AUTHORITATIVE',
    description: 'CourtListener public case-law search.',
    canHandle: r => r.route.domain === 'LAW_AND_TITLE',
    buildUrl: r => `https://www.courtlistener.com/api/rest/v3/search/?q=${enc(r.query)}&type=o&order_by=score%20desc`,
    parse: (p, r) => arr((p as any)?.results).slice(0,r.limit??20).map((x:any) => ({ providerId:'COURTLISTENER', provider:'LAW_LIBRARY', domain:r.route.domain, authorityTier:'TIER_2_AUTHORITATIVE', title:text(x.caseName)||text(x.case_name)||'Court opinion', url:x.absolute_url?`https://www.courtlistener.com${x.absolute_url}`:'https://www.courtlistener.com/', date:text(x.dateFiled)||text(x.date_filed), locator:text(x.citation?.[0])||text(x.docketNumber), metadata:x }))
  },
  {
    id: 'BLOCKSTREAM-BTC', provider: 'BLOCKCHAIN_EXPLORER', domains: ['BLOCKCHAIN'], authorityTier: 'TIER_1_PRIMARY',
    description: 'Bitcoin mainnet direct transaction/address lookup. Requires txid or address identifier.',
    canHandle: r => r.route.domain === 'BLOCKCHAIN' && Boolean(r.identifiers?.txid || r.identifiers?.address),
    buildUrl: r => r.identifiers?.txid ? `https://blockstream.info/api/tx/${enc(r.identifiers.txid)}` : `https://blockstream.info/api/address/${enc(r.identifiers?.address ?? '')}`,
    parse: (p, r) => [{ providerId:'BLOCKSTREAM-BTC', provider:'BLOCKCHAIN_EXPLORER', domain:'BLOCKCHAIN', authorityTier:'TIER_1_PRIMARY', title:r.identifiers?.txid?`Bitcoin transaction ${r.identifiers.txid}`:`Bitcoin address ${r.identifiers?.address}`, url:r.identifiers?.txid?`https://blockstream.info/tx/${r.identifiers.txid}`:`https://blockstream.info/address/${r.identifiers?.address}`, identifiers:r.identifiers, metadata:(p as Record<string,unknown>) ?? {} }]
  },
  {
    id: 'PATENTSVIEW', provider: 'PATENT_REGISTRY', domains: ['IP_AND_PATENTS'], authorityTier: 'TIER_1_PRIMARY',
    description: 'USPTO PatentsView patent search lane.',
    canHandle: r => r.route.domain === 'IP_AND_PATENTS',
    buildUrl: r => `https://search.patentsview.org/api/v1/patent/?q=${enc(JSON.stringify({_text_any:{patent_title:r.query}}))}&f=[%22patent_id%22,%22patent_title%22,%22patent_date%22]&o=${enc(JSON.stringify({size:Math.min(r.limit??20,100)}))}`,
    parse: (p, r) => arr((p as any)?.patents).map((x:any) => ({ providerId:'PATENTSVIEW', provider:'PATENT_REGISTRY', domain:'IP_AND_PATENTS', authorityTier:'TIER_1_PRIMARY', title:text(x.patent_title)||`Patent ${text(x.patent_id)}`, url:`https://patents.google.com/patent/US${text(x.patent_id)}`, date:text(x.patent_date), identifiers:{patentId:text(x.patent_id)}, metadata:x }))
  },
  {
    id: 'INTERNET-ARCHIVE', provider: 'ARCHIVE', domains: ['HISTORY_AND_ARCHIVES','GENEALOGY_AND_SUCCESSION','SACRED_CORPUS','MEDIA_AND_PUBLIC_RECORD'], authorityTier: 'TIER_3_SECONDARY',
    description: 'Internet Archive metadata discovery for books, scans, audio, video and historical captures.',
    canHandle: r => r.route.preferredProviders.includes('ARCHIVE'),
    buildUrl: r => `https://archive.org/advancedsearch.php?q=${enc(r.query)}&fl[]=identifier&fl[]=title&fl[]=date&rows=${Math.min(r.limit??20,50)}&page=1&output=json`,
    parse: (p, r) => arr((p as any)?.response?.docs).map((x:any) => ({ providerId:'INTERNET-ARCHIVE', provider:'ARCHIVE', domain:r.route.domain, authorityTier:'TIER_3_SECONDARY', title:text(x.title)||text(x.identifier), url:`https://archive.org/details/${text(x.identifier)}`, date:text(x.date), identifiers:{archiveId:text(x.identifier)}, metadata:x }))
  },
  {
    id: 'OPENALEX', provider: 'SCIENTIFIC_DATABASE', domains: ['SCIENCE_AND_NATURE'], authorityTier: 'TIER_2_AUTHORITATIVE',
    description: 'OpenAlex scholarly works discovery for scientific and academic research.',
    canHandle: r => r.route.domain === 'SCIENCE_AND_NATURE',
    buildUrl: r => `https://api.openalex.org/works?search=${enc(r.query)}&per-page=${Math.min(r.limit??20,50)}`,
    parse: (p, r) => arr((p as any)?.results).map((x:any) => ({ providerId:'OPENALEX', provider:'SCIENTIFIC_DATABASE', domain:'SCIENCE_AND_NATURE', authorityTier:'TIER_2_AUTHORITATIVE', title:text(x.title), url:text(x.doi)||text(x.id), date:text(x.publication_date), identifiers:{openAlex:text(x.id), doi:text(x.doi)}, metadata:{type:x.type, citedBy:x.cited_by_count, authorships:x.authorships} }))
  },
  {
    id: 'GDELT-DOC', provider: 'NEWS_MEDIA', domains: ['MEDIA_AND_PUBLIC_RECORD','GENERAL_WEB'], authorityTier: 'TIER_3_SECONDARY',
    description: 'GDELT document search for global media discovery and event leads.',
    canHandle: r => r.route.domain === 'MEDIA_AND_PUBLIC_RECORD' || r.route.domain === 'GENERAL_WEB',
    buildUrl: r => `https://api.gdeltproject.org/api/v2/doc/doc?query=${enc(r.query)}&mode=ArtList&maxrecords=${Math.min(r.limit??20,250)}&format=json`,
    parse: (p, r) => arr((p as any)?.articles).map((x:any) => ({ providerId:'GDELT-DOC', provider:'NEWS_MEDIA', domain:r.route.domain, authorityTier:'TIER_3_SECONDARY', title:text(x.title), url:text(x.url), date:text(x.seendate), metadata:{domain:x.domain, language:x.language, sourcecountry:x.sourcecountry} }))
  }
]

export function chooseExecutableAdapters(route: ResearchRoute, request?: Pick<RetrievalRequest,'identifiers'>) {
  const req: RetrievalRequest = { query:'', route, identifiers:request?.identifiers }
  return retrievalAdapters
    .filter(a => a.canHandle(req) || a.domains.includes(route.domain))
    .sort((a,b) => {
      const pa = route.preferredProviders.indexOf(a.provider); const pb = route.preferredProviders.indexOf(b.provider)
      return (pa < 0 ? 999 : pa) - (pb < 0 ? 999 : pb)
    })
}

export async function executeRetrieval(request: RetrievalRequest, transport: RetrievalTransport = fetch): Promise<RetrievalResponse[]> {
  const adapters = chooseExecutableAdapters(request.route, request)
  const out: RetrievalResponse[] = []
  for (const adapter of adapters) {
    if (!adapter.canHandle(request) && !adapter.domains.includes(request.route.domain)) continue
    const url = adapter.buildUrl(request)
    const warnings: string[] = []
    try {
      const response = await transport(url, { headers: { 'Accept':'application/json' } })
      if (!response.ok) { warnings.push(`${response.status} ${response.statusText}`); out.push({providerId:adapter.id,request,hits:[],warnings,retrievedAt:new Date().toISOString()}); continue }
      const payload = await response.json()
      out.push({ providerId:adapter.id, request, hits:adapter.parse(payload,request), warnings, retrievedAt:new Date().toISOString() })
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error))
      out.push({ providerId:adapter.id, request, hits:[], warnings, retrievedAt:new Date().toISOString() })
    }
  }
  return out
}

export const retrievalAdapterLayer = {
  id:'NEO-RETRIEVAL-ADAPTERS',
  title:'NEO Retrieval Adapter Layer',
  role:'EXECUTABLE_MULTI_PROVIDER_RETRIEVAL_NORMALIZATION',
  providers:retrievalAdapters.map(a => a.id),
  integrity:[
    'Provider output is normalized into evidence candidates; retrieval does not establish truth.',
    'Primary and authoritative records retain their provider and authority tier.',
    'Failed providers return warnings instead of silently disappearing.',
    'Domain routing and evidence classification remain separate stages.',
    'High-impact conclusions remain governed by Autonomous Inquiry review gates.'
  ] as const
} as const
