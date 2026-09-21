import { createFirestoreRestDb } from '../neo-counter-backend/firestore-rest-db.mjs'

const COLLECTION='neo_ai_provider_telemetry'

function blank(id){
  return {id,attempts:0,successes:0,failures:0,lastLatencyMs:null,lastSuccessAt:null,lastFailureAt:null,lastError:null,updatedAt:null}
}

export function createProviderTelemetryStore({projectId,databaseId='(default)',db,now=()=>new Date()}={}){
  const firestore=db??createFirestoreRestDb({projectId,databaseId})

  async function record({provider,event,latencyMs,error}){
    if(!provider) return
    const ref=firestore.collection(COLLECTION).doc(provider)
    await firestore.runTransaction(async tx=>{
      const snap=await tx.get(ref)
      const current=snap.exists?{...blank(provider),...snap.data()}:blank(provider)
      current.attempts+=event==='attempt'?1:0
      current.successes+=event==='success'?1:0
      current.failures+=event==='failure'?1:0
      if(event==='success'){
        current.lastLatencyMs=Number.isFinite(latencyMs)?Math.max(0,Math.trunc(latencyMs)):current.lastLatencyMs
        current.lastSuccessAt=now().toISOString()
        current.lastError=null
      }
      if(event==='failure'){
        current.lastFailureAt=now().toISOString()
        current.lastError=String(error??'provider_failure').slice(0,500)
      }
      current.updatedAt=now().toISOString()
      tx.set(ref,current)
    })
  }

  async function get(provider){
    const snap=await firestore.collection(COLLECTION).doc(provider).get()
    return snap.exists?{...blank(provider),...snap.data()}:blank(provider)
  }

  async function snapshot(providerIds=[]){
    const rows=await Promise.all(providerIds.map(get))
    return Object.fromEntries(rows.map(row=>[row.id,row]))
  }

  return {record,get,snapshot}
}
