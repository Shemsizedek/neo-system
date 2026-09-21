import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMuseBrief } from './muse-brief.mjs'

test('builds a copy-ready Muse brief without API session internals', () => {
  const thread={
    id:'thread-1',title:'NEO Project',lastResponseId:'resp_secret',subjectId:'neo-user-1',
    knowledgeAttachments:['lib-1'],
    handoffs:[{sourceApp:'Meta Muse app',sourceType:'muse-app-copy',importedAt:'2026-09-21T20:00:00Z',contentHash:'sha256:secret'}],
    messages:[
      {role:'user',text:'Continue the launch plan'},
      {role:'assistant',provider:'meta-muse',text:'Use api_key=supersecret and proceed'},
    ],
  }
  const result=buildMuseBrief({thread,knowledge:[{title:'NEO Reference Record'}]})
  assert.match(result.brief,/NEO → MUSE HANDOFF BRIEF/)
  assert.match(result.brief,/NEO Reference Record/)
  assert.match(result.brief,/Current objective: Continue the launch plan/)
  assert.match(result.brief,/\[REDACTED\]/)
  assert.doesNotMatch(result.brief,/resp_secret/)
  assert.doesNotMatch(result.brief,/neo-user-1/)
  assert.doesNotMatch(result.brief,/sha256:secret/)
  assert.equal(result.sessionLinkage,'new-muse-app-conversation')
})

test('limits recent working context', () => {
  const thread={id:'t',title:'T',messages:Array.from({length:20},(_,i)=>({role:'user',text:'m'+i}))}
  const result=buildMuseBrief({thread})
  assert.equal(result.messageCount,12)
  assert.doesNotMatch(result.brief,/User: m0\b/)
  assert.match(result.brief,/User: m19\b/)
})
