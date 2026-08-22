import { describe, expect, it } from 'vitest'
import { findNeoLingoTerm, neoLingoCodex, translateNeoLingo, validateNeoLingoCodex } from './index'

describe('NEO Lingo registry', () => {
  it('resolves canonical terms and aliases without case sensitivity', () => {
    expect(findNeoLingoTerm('  NOOLOGY  ')?.term).toBe('Noology')
    expect(findNeoLingoTerm('system charter')?.term).toBe('NEO Protocol')
  })

  it('passes the codex integrity audit', () => {
    expect(validateNeoLingoCodex(neoLingoCodex)).toEqual([])
  })

  it('reports ambiguous duplicate labels', () => {
    const duplicated = [...neoLingoCodex, {
      term: 'Example', aliases: ['Noology'], laymanTranslation: 'Example translation', definition: 'Example definition.'
    }]
    expect(validateNeoLingoCodex(duplicated)).toContainEqual(expect.objectContaining({ code: 'DUPLICATE_LABEL', label: 'Noology' }))
  })
})

describe('NEO Lingo translation', () => {
  it('preserves the source while producing a plain-language rendering', () => {
    const result = translateNeoLingo('Noology follows the NEO Protocol.')
    expect(result.source).toBe('Noology follows the NEO Protocol.')
    expect(result.plainLanguage).toBe('Mindset / Consciousness state follows the Operating rules / Standard operating procedure.')
    expect(result.matchedTerms.map(entry => entry.term)).toEqual(['Noology', 'NEO Protocol'])
  })

  it('does not replace a term embedded inside another word', () => {
    const result = translateNeoLingo('A protocolized workflow is not the NEO Protocol.')
    expect(result.plainLanguage).toContain('protocolized')
    expect(result.matchedTerms.map(entry => entry.term)).toEqual(['NEO Protocol'])
  })

  it('returns an unchanged rendering when no term matches', () => {
    const result = translateNeoLingo('Ordinary language remains ordinary.')
    expect(result.plainLanguage).toBe(result.source)
    expect(result.matchedTerms).toEqual([])
  })
})
