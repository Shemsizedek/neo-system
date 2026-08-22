export type NeoLingoTerm = {
  term: string
  aliases?: string[]
  laymanTranslation: string
  definition: string
  preserveSourceTerm?: boolean
}

export type NeoLingoTranslation = {
  source: string
  plainLanguage: string
  matchedTerms: Array<{
    term: string
    laymanTranslation: string
    definition: string
  }>
  notes: string[]
}

export type NeoLingoValidationIssue = {
  code: 'EMPTY_TERM' | 'EMPTY_TRANSLATION' | 'EMPTY_DEFINITION' | 'DUPLICATE_LABEL'
  term: string
  label?: string
  message: string
}
