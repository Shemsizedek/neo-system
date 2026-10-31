import { describe, expect, it } from 'vitest'
import { searchNoogleNoology } from './noogleNoologicalSearch'
import { sacredChambersDoctrine } from './sacredChambersDoctrine'

describe('NEO-SYNC-602 Sacred Chambers retrieval', () => {
  it('exposes all ten canonical doctrine IDs without duplicates', () => {
    const ids = sacredChambersDoctrine.map(record => record.id)
    expect(ids).toHaveLength(10)
    expect(new Set(ids).size).toBe(10)
    expect(ids).toEqual(Array.from({ length: 10 }, (_, index) => `SCN-${String(index + 1).padStart(3, '0')}`))
  })

  it.each([
    ['Ninsat', 'SCN-002'],
    ['Het-Haru', 'SCN-001'],
    ['NEO-analysis', 'SCN-003'],
    ['SEBABOND', 'SCN-008'],
    ['consent', 'SCN-004'],
  ])('retrieves %s with provenance', (term, expectedId) => {
    const results = searchNoogleNoology({ text: term, limit: 100 })
    const record = results.find(result => result.id === expectedId)
    expect(record).toBeDefined()
    expect(record?.kind).toBe('DOCTRINE')
    expect(record?.provenance).toBeTruthy()
  })

  it('preserves historical and clinical distinctions', () => {
    const ninsat = sacredChambersDoctrine.find(record => record.id === 'SCN-002')
    const analysis = sacredChambersDoctrine.find(record => record.id === 'SCN-003')
    expect(ninsat?.teaching).toContain('not an attested ancient word')
    expect(analysis?.operationalization).toContain('licensed clinical diagnosis')
  })
})
