import assert from 'node:assert/strict'
import test from 'node:test'
import { createMuseProjectStore } from './muse-project-store.mjs'

function memoryDb(){
  const rows=new Map()
  return {
    collection(name){
      return {
        doc(id){
          return {
            async get(){
              const key=name+':'+id
              return rows.has(key)
                ? {exists:true,data:()=>structuredClone(rows.get(key))}
                : {exists:false,data:()=>undefined}
            },
            async set(value){
              rows.set(name+':'+id,structuredClone(value))
            },
          }
        },
        where(field,op,value){
          return {
            orderBy(){
              return {
                limit(){
                  return {
                    async get(){
                      const docs=[...rows.entries()]
                        .filter(([key,row])=>key.startsWith(name+':')&&row[field]===value)
                        .map(([,row])=>({data:()=>structuredClone(row)}))
                      return {docs}
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
  }
}

test('records project transfer lineage and detects changes', async()=>{
  let tick=0
  const store=createMuseProjectStore({
    db:memoryDb(),
    now:()=>new Date(1_700_000_000_000+(tick++*1000)),
  })
  const p=await store.createProject({subjectId:'u1',name:'Project A'})
  const a=await store.recordTransfer({subjectId:'u1',projectId:p.id,direction:'muse-to-neo',threadId:'t1',content:'alpha',summary:'in'})
  const b=await store.recordTransfer({subjectId:'u1',projectId:p.id,direction:'neo-to-muse',threadId:'t1',content:'beta',summary:'out'})
  assert.equal(b.previousTransferId,a.id)
  const transfers=await store.listTransfers({subjectId:'u1',projectId:p.id})
  assert.equal(transfers.length,2)
  assert.equal(store.compareTransfers(transfers[0],transfers[1]).changed,true)
  assert.equal((await store.listProjects({subjectId:'u1'}))[0].transferCount,2)
})
