import assert from 'node:assert/strict'
import test from 'node:test'
import { createConversationStore } from './conversation-store.mjs'

function memoryDb() {
  const rows = new Map()
  return {
    collection() {
      return {
        doc(id) {
          return {
            async get(){ return rows.has(id) ? {exists:true,data:()=>structuredClone(rows.get(id))} : {exists:false,data:()=>undefined} },
            async set(value){ rows.set(id, structuredClone(value)) },
            async delete(){ rows.delete(id) },
          }
        },
        where(field,op,value) {
          return {
            orderBy() {
              return {
                limit() {
                  return { async get(){ return {docs:[...rows.values()].filter(x=>x[field]===value).map(x=>({data:()=>structuredClone(x)}))} } }
                }
              }
            }
          }
        }
      }
    }
  }
}

test('persists, resumes, renames and isolates NEOsync threads', async () => {
  const db=memoryDb()
  let tick=0
  const store=createConversationStore({db,now:()=>new Date(1_700_000_000_000+(tick++*1000))})
  const thread=await store.createThread({subjectId:'neo-user-1',title:'Temple Muse',capability:'personalization'})
  await store.appendTurn({subjectId:'neo-user-1',threadId:thread.id,objective:'First turn',capability:'personalization',result:{provider:'meta-muse',text:'First answer',responseId:'resp_1'}})
  const resumed=await store.getThread({subjectId:'neo-user-1',threadId:thread.id})
  assert.equal(resumed.lastResponseId,'resp_1')
  assert.equal(resumed.messages.length,2)
  assert.equal(resumed.messages[1].text,'First answer')
  const renamed=await store.renameThread({subjectId:'neo-user-1',threadId:thread.id,title:'Renamed Thread'})
  assert.equal(renamed.title,'Renamed Thread')
  const pinned=await store.updateThread({subjectId:'neo-user-1',threadId:thread.id,pinned:true,archived:true,knowledgeAttachments:['lib-1','lib-1','lib-2']})
  assert.equal(pinned.pinned,true)
  assert.equal(pinned.archived,true)
  assert.deepEqual(pinned.knowledgeAttachments,['lib-1','lib-2'])
  const listed=await store.listThreads({subjectId:'neo-user-1'})
  assert.equal(listed.length,1)
  assert.equal(listed[0].pinned,true)
  assert.equal((await store.listThreads({subjectId:'neo-user-1',includeArchived:false})).length,0)
  await assert.rejects(()=>store.getThread({subjectId:'other-user',threadId:thread.id}),/thread_forbidden/)
  assert.equal(await store.deleteThread({subjectId:'neo-user-1',threadId:thread.id}),true)
  assert.equal(await store.getThread({subjectId:'neo-user-1',threadId:thread.id}),null)
})


test('stores imported Muse handoff context without API session linkage', async () => {
  const db=memoryDb()
  const store=createConversationStore({db,now:()=>new Date('2026-09-21T20:00:00Z')})
  const thread=await store.createThread({
    subjectId:'neo-user-1',
    title:'Muse handoff',
    handoffs:[{sourceApp:'Meta Muse app',contentHash:'sha256:test',sessionLinkage:'content-handoff-only'}],
    handoffContext:'Copied Muse context',
  })
  assert.equal(thread.lastResponseId,null)
  assert.equal(thread.handoffs[0].sessionLinkage,'content-handoff-only')
  assert.equal(thread.messages[0].role,'external')
  assert.equal(thread.messages[0].provider,'Meta Muse')
  assert.match(thread.handoffContext,/Copied Muse context/)
})
