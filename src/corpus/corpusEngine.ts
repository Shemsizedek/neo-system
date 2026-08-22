export type AuthorityLayer =
  | 'DIVINE'
  | 'ECCLESIASTICAL'
  | 'NOOCRATIC_CONSTITUTIONAL'
  | 'ADMINISTRATIVE'
  | 'HISTORICAL'
  | 'UNITED_STATES'
  | 'INTERNATIONAL'

export type RecordStatus = 'ACTIVE' | 'HISTORICAL' | 'REFERENCE' | 'PROPOSED' | 'SUPERSEDED'
export type VerificationStatus = 'SOURCE_SUPPLIED' | 'PRIMARY_SOURCE_VERIFIED' | 'PARTIAL' | 'UNVERIFIED'

export interface CorpusRecord {
  id: string
  title: string
  shortTitle?: string
  instrumentType: string
  authorityLayer: AuthorityLayer
  issuingAuthority: string
  date?: string
  sourceEra?: string
  jurisdictionScope: string
  status: RecordStatus
  verification: VerificationStatus
  sourceUrl?: string
  relatedAuthorities: string[]
  tags: string[]
  summary: string
  immutable: boolean
  parentId?: string
  supersedes?: string[]
  sourceFingerprint?: string
}

export interface CorpusQuery {
  text?: string
  layers?: AuthorityLayer[]
  statuses?: RecordStatus[]
  verification?: VerificationStatus[]
  tags?: string[]
}

const normalize = (value: string) => value.trim().toLowerCase()

export function searchCorpus(records: CorpusRecord[], query: CorpusQuery): CorpusRecord[] {
  const text = normalize(query.text ?? '')
  const tags = (query.tags ?? []).map(normalize)
  return records.filter(record => {
    if (query.layers?.length && !query.layers.includes(record.authorityLayer)) return false
    if (query.statuses?.length && !query.statuses.includes(record.status)) return false
    if (query.verification?.length && !query.verification.includes(record.verification)) return false
    if (tags.length && !tags.every(tag => record.tags.map(normalize).includes(tag))) return false
    if (!text) return true
    const haystack = [
      record.id,
      record.title,
      record.shortTitle ?? '',
      record.instrumentType,
      record.issuingAuthority,
      record.jurisdictionScope,
      record.summary,
      ...record.tags,
      ...record.relatedAuthorities,
    ].join(' ').toLowerCase()
    return haystack.includes(text)
  })
}

export function getAuthority(recordId: string, records: CorpusRecord[]) {
  return records.find(record => record.id === recordId)
}

export function getAuthorityGraph(recordId: string, records: CorpusRecord[]) {
  const root = getAuthority(recordId, records)
  if (!root) return { root: undefined, related: [] as CorpusRecord[] }
  const relatedIds = new Set(root.relatedAuthorities)
  if (root.parentId) relatedIds.add(root.parentId)
  for (const record of records) {
    if (record.relatedAuthorities.includes(recordId) || record.parentId === recordId) relatedIds.add(record.id)
  }
  return {
    root,
    related: records.filter(record => relatedIds.has(record.id)),
  }
}

export function corpusStats(records: CorpusRecord[]) {
  const layers = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.authorityLayer] = (acc[record.authorityLayer] ?? 0) + 1
    return acc
  }, {})
  return {
    total: records.length,
    immutable: records.filter(record => record.immutable).length,
    verified: records.filter(record => record.verification === 'PRIMARY_SOURCE_VERIFIED').length,
    unverified: records.filter(record => record.verification === 'UNVERIFIED').length,
    layers,
  }
}

export async function sha256Fingerprint(sourceText: string): Promise<string> {
  const bytes = new TextEncoder().encode(sourceText)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export function canMutateHistoricalRecord(record: CorpusRecord) {
  return !record.immutable
}

export function createAddendum(base: CorpusRecord, input: Omit<CorpusRecord, 'immutable' | 'parentId'>): CorpusRecord {
  return {
    ...input,
    immutable: true,
    parentId: base.id,
    relatedAuthorities: Array.from(new Set([base.id, ...input.relatedAuthorities])),
  }
}
