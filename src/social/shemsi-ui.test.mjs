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


test('original Shemsi voice engine is preserved inside the production UI',async()=>{
  const app=await fs.readFile(new URL('./ShemsiCommentAssistantApp.tsx',import.meta.url),'utf8')
  const engine=await fs.readFile(new URL('./shemsiVoiceEngine.ts',import.meta.url),'utf8')
  assert.match(app,/ORIGINAL VOICE ENGINE/)
  assert.match(app,/Generate original 3 drafts/)
  assert.match(engine,/Insightful/)
  assert.match(engine,/Houston Local/)
  assert.match(engine,/Short & Punchy/)
  assert.match(engine,/Value-add/)
  assert.match(engine,/Curiosity question/)
  assert.match(engine,/Short punchy/)
  assert.match(engine,/No spam, no link drops, no DM bait/)
  assert.match(engine,/if\(value\.length>90\)/)
})
