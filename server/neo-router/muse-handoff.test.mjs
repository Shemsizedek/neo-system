import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMuseHandoff } from './muse-handoff.mjs'

test('normalizes copied Muse app content with provenance hash', () => {
  const result=parseMuseHandoff({sourceType:'muse-app-copy',content:'Muse answer\nNext idea'})
  assert.equal(result.sourceApp,'Meta Muse app')
  assert.equal(result.format,'text')
  assert.match(result.contentHash,/^sha256:[a-f0-9]{64}$/)
  assert.match(result.context,/Muse answer/)
})

test('extracts readable context from Muse Code trajectory JSON', () => {
  const content=JSON.stringify({messages:[{role:'user',content:'Build this'},{role:'assistant',content:'Done'}]})
  const result=parseMuseHandoff({sourceType:'muse-code-trajectory',filename:'trajectory.json',content})
  assert.equal(result.sourceApp,'Muse Code')
  assert.equal(result.format,'json')
  assert.match(result.context,/user: Build this/)
  assert.match(result.context,/assistant: Done/)
})

test('rejects empty and invalid trajectory handoffs', () => {
  assert.throws(()=>parseMuseHandoff({content:'  '}),/handoff_content_required/)
  assert.throws(()=>parseMuseHandoff({sourceType:'muse-code-trajectory',content:'{nope'}),/invalid_handoff_json/)
})
