import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

test('Shemsi UI keeps publishing separated from draft generation',async()=>{
  const source=await fs.readFile(new URL('./ShemsiCommentAssistantApp.tsx',import.meta.url),'utf8')
  assert.match(source,/Human approval required/)
  assert.match(source,/Publishing adapter not enabled in this gate/)
  assert.match(source,/Approve draft/)
})

test('Shemsi client calls the NEO AI gateway without action authority',async()=>{
  const source=await fs.readFile(new URL('./shemsiClient.ts',import.meta.url),'utf8')
  assert.match(source,/\/api\/ai\/execute/)
  assert.match(source,/actions:\[\]/)
  assert.match(source,/approved:false/)
})
