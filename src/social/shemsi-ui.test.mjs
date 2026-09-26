import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

test('Shemsi UI separates generation approval and publication',async()=>{
  const source=await fs.readFile(new URL('./ShemsiCommentAssistantApp.tsx',import.meta.url),'utf8')
  assert.match(source,/Human approval required/)
  assert.match(source,/Approve draft/)
  assert.match(source,/Publish approved reply/)
  assert.match(source,/Adapter status is authoritative/)
})

test('Shemsi clients keep AI generation non-actioning and social writes explicit',async()=>{
  const source=await fs.readFile(new URL('./shemsiClient.ts',import.meta.url),'utf8')
  assert.match(source,/\/api\/ai\/execute/)
  assert.match(source,/actions:\[\]/)
  assert.match(source,/approved:false/)
  assert.match(source,/\/api\/shemsi\/drafts/)
  assert.match(source,/\/approve/)
  assert.match(source,/\/publish/)
})
