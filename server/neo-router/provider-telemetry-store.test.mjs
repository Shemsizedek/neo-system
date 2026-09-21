import assert from 'node:assert/strict'
import test from 'node:test'
import { createProviderTelemetryStore } from './provider-telemetry-store.mjs'

function memoryDb(){
  const rows=new Map()
  return {
    collection(){
      return {doc(id){
        return {
          id,
          async get(){return rows.has(id)?{exists:true,data:()=>structuredClone(rows.get(id))}:{exists:false,data:()=>undefined}}
        }
      }}
    },
    async runTransaction(work){
      const tx={
        async get(ref){return ref.get()},
        set(ref,value){rows.set(ref.id,structuredClone(value))}
      }
      return work(tx)
    }
  }
}

test('durable provider telemetry accumulates across events', async()=>{
  const db=memoryDb()
  let tick=0
  const store=createProviderTelemetryStore({db,now:()=>new Date(1_700_000_000_000+(tick++*1000))})
  await store.record({provider:'meta-muse',event:'attempt'})
  await store.record({provider:'meta-muse',event:'success',latencyMs:1234})
  await store.record({provider:'meta-muse',event:'attempt'})
  await store.record({provider:'meta-muse',event:'failure',error:'timeout'})
  const row=await store.get('meta-muse')
  assert.equal(row.attempts,2)
  assert.equal(row.successes,1)
  assert.equal(row.failures,1)
  assert.equal(row.lastLatencyMs,1234)
  assert.equal(row.lastError,'timeout')
  const snap=await store.snapshot(['meta-muse','openai'])
  assert.equal(snap['meta-muse'].successes,1)
  assert.equal(snap.openai.attempts,0)
})
