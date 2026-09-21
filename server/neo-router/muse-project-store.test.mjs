import assert from 'node:assert/strict'
import test from 'node:test'
import { createMuseProjectStore } from './muse-project-store.mjs'

function memoryDb(){
  const rows=new Map();
  return {
    collection(name){ return {
      doc(id){ return {
        async get(){ const k=name+':'+id; return rows.has(k)?{exists:true,data:()=>structuredClone(rows.get(k))}:{exists:false,data:()=>undefined} },
        async set(v){ rows.set(name+':'+id,structuredClone(v)) }
      }},
      where(field,op,value){ return { orderBy(){ return { limit(){ return { async get(){ return {docs:[...rows.entries()].filter(([k,v])=>k.startsWith(name+':')&&v[field]===value).map(([,v])=>({data:()=>structuredClone(v)}))} } } } } } }
    }}
  }
}

test('records project transfer lineage and detects changes', async()=>{
  const store=createMuseProjectStore({db:memoryDb(),now:(()=>{let n=0;return()=>new Date(1700000000000+n++*1000)})()})
  const p=await store.createProject({subjectId:'u1',name:'Project A'})
  const a=await store.recordTransfer({subjectId:'u1',projectId:p.id,direction:'muse-to-neo',threadId:'t1',content:'alpha',summary:'in'})
  const b=await store.recordTransfer({subjectId:'u1',projectId:p.id,direction:'neo-to-muse',threadId:'t1',content:'beta',summary:'out'})
  assert.equal(b.previousTransferId,a.id)
  const transfers=await store.listTransfers({subjectId:'u1',projectId:p.id})
  assert.equal(transfers.length,2)
  assert.equal(store.compareTransfers(transfers[0],transfers[1]).changed,true)
  assert.equal((await store.listProjects({subjectId:'u1'}))[0].transferCount,2)
})
