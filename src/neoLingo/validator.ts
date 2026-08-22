import type { NeoLingoTerm, NeoLingoValidationIssue } from './types'

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase()
}

/** Audits a codex without mutating it. */
export function validateNeoLingoCodex(codex: readonly NeoLingoTerm[]): NeoLingoValidationIssue[] {
  const issues: NeoLingoValidationIssue[] = []
  const owners = new Map<string, string>()

  for (const entry of codex) {
    const term = entry.term.trim()
    if (!term) issues.push({ code: 'EMPTY_TERM', term: entry.term, message: 'Canonical terms must not be empty.' })
    if (!entry.laymanTranslation.trim()) issues.push({ code: 'EMPTY_TRANSLATION', term, message: 'Layman translations must not be empty.' })
    if (!entry.definition.trim()) issues.push({ code: 'EMPTY_DEFINITION', term, message: 'Definitions must not be empty.' })

    for (const label of [entry.term, ...(entry.aliases ?? [])]) {
      const normalized = normalizeLabel(label)
      if (!normalized) continue
      const owner = owners.get(normalized)
      if (owner) {
        issues.push({ code: 'DUPLICATE_LABEL', term, label, message: `Label "${label}" is already assigned to "${owner}".` })
      } else {
        owners.set(normalized, term)
      }
    }
  }

  return issues
}
