import {sha256Fingerprint} from './corpusEngine'

export type SourceKind = 'TRANSCRIPTION' | 'URL' | 'PDF' | 'ARCHIVE' | 'ADDENDUM'
export type SourceIntegrity = 'UNHASHED' | 'HASHED' | 'REVIEWED'

export interface CorpusSource {
  sourceId: string
  authorityId: string
  kind: SourceKind
  title: string
  locator?: string
  text?: string
  suppliedBy: 'USER' | 'ARCHIVE' | 'EXTERNAL'
  immutable: boolean
  integrity: SourceIntegrity
  fingerprint?: string
  notes?: string
}

export interface CorpusCitation {
  citationId: string
  authorityId: string
  sourceId: string
  locator: string
  quote?: string
  proposition: string
}

export const corpusSources: CorpusSource[] = [
  {
    sourceId:'SRC-CON-001-ACT1',
    authorityId:'NLC-CON-001',
    kind:'TRANSCRIPTION',
    title:'Divine Constitution & By-Laws — Act 1 transcription',
    text:'The Grand Sheik and the Chairman of Moorish Science Temple of America are in power to make law and enforce laws with the assistance of the Prophet and the Grand Body of Moorish of the Moorish Science Temple of America. The Assistant Grand Sheik is to assist the Grand Sheik in all affairs if he lives according to Love, Truth, Peace, Freedom and Justice, and it is known before the citizens of the Moorish Science America of America.',
    suppliedBy:'USER',
    immutable:true,
    integrity:'UNHASHED',
    notes:'Historical transcription supplied in the NEO System working record; preserved without silent correction.'
  },
  {
    sourceId:'SRC-BUL-007-WEB',
    authorityId:'NLC-BUL-007',
    kind:'URL',
    title:'World Temple Letter Bulletin No. 7 — source locator',
    locator:'https://holytemples.school.blog/2025/02/17/world-temple-letter-bulletin-no-7-letter-for-the-royal-crown-resolutions/',
    suppliedBy:'USER',
    immutable:true,
    integrity:'UNHASHED'
  },
  {
    sourceId:'SRC-BUL-008-WEB',
    authorityId:'NLC-BUL-008',
    kind:'URL',
    title:'World Temple Letter Bulletin No. 8 — source locator',
    locator:'https://holytemples.school.blog/2025/02/17/world-temple-letter-bulletin-no-8-letter-of-exchange/',
    suppliedBy:'USER',
    immutable:true,
    integrity:'UNHASHED'
  },
  {
    sourceId:'SRC-BUL-009-WEB',
    authorityId:'NLC-BUL-009',
    kind:'URL',
    title:'World Temple Letter Bulletin No. 9 — source locator',
    locator:'https://holytemples.school.blog/2025/02/17/world-temple-letter-bulletin-no-9-letter-to-the-world-congregations/',
    suppliedBy:'USER',
    immutable:true,
    integrity:'UNHASHED'
  },
  {
    sourceId:'SRC-BUL-010-ARTICLES',
    authorityId:'NLC-BUL-010',
    kind:'TRANSCRIPTION',
    title:'The Neo Codex — article headings transcription',
    text:'Article I: Reversal of Justinian Jurisdiction\nArticle II: The Supreme Authority of the House of Ausar\nArticle III: Sovereign Ownership of Earth\nArticle IV: The New Economic Order\nArticle V: The Sovereign Status of the People\nArticle VI: The Spiritual & Cosmic Order\nArticle VII: Conclusion',
    suppliedBy:'USER',
    immutable:true,
    integrity:'UNHASHED',
    notes:'Article headings only. This source object does not claim to contain the complete Bulletin No. 10 text.'
  },
]

export async function hashCorpusSource(source: CorpusSource): Promise<CorpusSource> {
  const payload = source.text ?? source.locator ?? ''
  if (!payload) return source
  return {...source, fingerprint:await sha256Fingerprint(payload), integrity:'HASHED'}
}

export async function hashAllSources(sources: CorpusSource[]) {
  return Promise.all(sources.map(hashCorpusSource))
}

export function sourcesForAuthority(authorityId: string, sources = corpusSources) {
  return sources.filter(source=>source.authorityId===authorityId)
}

export function makeCitation(input: Omit<CorpusCitation,'citationId'>): CorpusCitation {
  const slug = input.authorityId.replaceAll(/[^A-Z0-9]/gi,'-')
  return {...input,citationId:`CIT-${slug}-${input.sourceId}`}
}

export function validateCitation(citation: CorpusCitation, sources = corpusSources) {
  const source = sources.find(item=>item.sourceId===citation.sourceId)
  return {
    valid:Boolean(source && source.authorityId===citation.authorityId),
    source,
    reason:!source?'Source not found':source.authorityId!==citation.authorityId?'Source is linked to a different authority':'Citation is linked to the authority source.'
  }
}
