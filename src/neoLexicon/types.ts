export type NeoLexiconEntryType = 'term' | 'language' | 'script' | 'symbol' | 'person' | 'place' | 'source_claim'

export type NeoLexiconSourceStatus = 'SOURCE_TERM' | 'SOURCE_DEFINITION' | 'SOURCE_CLAIM'

export type NeoLexiconSecurityEligibility = 'NONE' | 'DISPLAY_ONLY' | 'SEMANTIC_SEED_ONLY'

export type NeoLexiconEntry = {
  id: string
  canonicalTerm: string
  entryType: NeoLexiconEntryType
  plainLanguage: string
  sourcePosition: string
  sourceStatus: NeoLexiconSourceStatus
  aliases: string[]
  relations: string[]
  restrictions: string[]
  securityEligibility: NeoLexiconSecurityEligibility
}

export type NeoLexiconSourceLayer = {
  id: string
  title: string
  sourceType: string
  pageCount: number
  status: 'SOURCE-BOUND'
  provenancePolicy: string
  entries: NeoLexiconEntry[]
}
