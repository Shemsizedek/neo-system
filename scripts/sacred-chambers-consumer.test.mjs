import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8')
const doctrine = read('../src/noology/sacredChambersDoctrine.ts')
const noogle = read('../src/noology/noogleNoologicalSearch.ts')
const neopedia = read('../src/noology/neopediaRecursive.ts')

test('SCN-001 through SCN-010 are defined exactly once', () => {
  const ids = [...doctrine.matchAll(/id: '(SCN-\d{3})'/g)].map(match => match[1])
  assert.deepEqual(ids, Array.from({length: 10}, (_, index) => `SCN-${String(index + 1).padStart(3, '0')}`))
})

test('both knowledge consumers include Sacred Chambers records', () => {
  for (const consumer of [noogle, neopedia]) {
    assert.match(consumer, /import \{ sacredChambersDoctrine \} from '\.\/sacredChambersDoctrine'/)
    assert.match(consumer, /\.\.\.neoDoctrineRegistry, \.\.\.sacredChambersDoctrine/)
  }
})

test('neology, consent and clinical classification controls are retained', () => {
  assert.match(doctrine, /not an attested ancient word/)
  assert.match(doctrine, /licensed clinical diagnosis/)
  assert.match(doctrine, /voluntary, informed and revocable consent/)
  assert.match(doctrine, /jurisdiction-specific review/)
})
