import { neoLingoCodex } from './registry'
import type { NeoLingoTranslation } from './types'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function translateNeoLingo(source: string): NeoLingoTranslation {
  const matchedTerms = neoLingoCodex.filter(entry => {
    const candidates = [entry.term, ...(entry.aliases ?? [])]
    return candidates.some(candidate =>
      new RegExp(`\\b${escapeRegExp(candidate)}\\b`, 'i').test(source)
    )
  })

  let plainLanguage = source

  for (const entry of matchedTerms) {
    const candidates = [entry.term, ...(entry.aliases ?? [])]
    for (const candidate of candidates) {
      plainLanguage = plainLanguage.replace(
        new RegExp(`\\b${escapeRegExp(candidate)}\\b`, 'gi'),
        entry.laymanTranslation
      )
    }
  }

  return {
    source,
    plainLanguage,
    matchedTerms: matchedTerms.map(entry => ({
      term: entry.term,
      laymanTranslation: entry.laymanTranslation,
      definition: entry.definition
    })),
    notes: [
      'Plain-language rendering is explanatory, not authoritative substitution.',
      'Specialized NEO terminology remains preserved in the source layer.',
      'Pa Sarun vocabulary, title authority, naming rules, and Temple doctrine are never overridden by NEO Lingo.'
    ]
  }
}
