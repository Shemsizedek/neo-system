import crypto from 'node:crypto'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createStateRecord({namespace,id,data,version=1,updatedAt=now()}={}){
  if(!namespace||!id)throw new TypeError('namespace and id required')
  const record={namespace:String(namespace),id:String(id),data:clone(data??{}),version:Number(version),updated_at:updatedAt}
  return {...record,digest:digest(record)}
}

export function createJournalEntry({namespace,id,operation,before=null,after=null,actor='system',sequence}={}){
  if(!namespace||!id||!operation)throw new TypeError('namespace, id and operation required')
  const entry={journal_id:`JRN-${crypto.randomUUID()}`,namespace:String(namespace),id:String(id),operation:String(operation).toUpperCase(),sequence:Number(sequence||Date.now()),before:clone(before),after:clone(after),actor,recorded_at:now()}
  return {...entry,digest:digest(entry)}
}

export function compareRecords(primary,secondary){
  if(!primary&&!secondary)return {equal:true,state:'BOTH_MISSING'}
  if(!primary||!secondary)return {equal:false,state:'MISSING_SIDE'}
  const equal=primary.digest===secondary.digest
  return {equal,state:equal?'MATCH':'DRIFT',primary_digest:primary.digest,secondary_digest:secondary.digest}
}

export function evaluateMigrationReadiness({mode='FIRESTORE_PRIMARY',comparisons=[],backupVerified=false,replicaHealthy=false,rollbackReady=false}={}){
  const criticalDrift=comparisons.filter(x=>x.equal===false).length
  const ready=mode==='DUAL_WRITE'&&criticalDrift===0&&backupVerified&&replicaHealthy&&rollbackReady
  return {ready,mode,critical_drift:criticalDrift,backup_verified:Boolean(backupVerified),replica_healthy:Boolean(replicaHealthy),rollback_ready:Boolean(rollbackReady),cutover_authorized:false}
}

export function nextMigrationMode({current,readiness,approved=false}={}){
  const allowed={
    FIRESTORE_PRIMARY:'DUAL_WRITE',
    DUAL_WRITE:'POSTGRES_PRIMARY',
    POSTGRES_PRIMARY:'FIRESTORE_READ_ONLY',
    FIRESTORE_READ_ONLY:'CUTOVER_COMPLETE'
  }
  const target=allowed[current]||null
  if(!target)return {current,target:null,changed:false,reason:'terminal_or_invalid'}
  if(current==='DUAL_WRITE'&&(!readiness?.ready||!approved))return {current,target,changed:false,reason:!readiness?.ready?'readiness_failed':'approval_required'}
  if(!approved&&current!=='FIRESTORE_PRIMARY')return {current,target,changed:false,reason:'approval_required'}
  return {current:target,target,changed:true,reason:'authorized_transition'}
}

export function buildStateFabricSnapshot({mode='FIRESTORE_PRIMARY',namespaces=[],journalDepth=0,replicas=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Sovereign Database and State',
    mode,
    namespaces:[...namespaces],
    journal_depth:Number(journalDepth),
    replicas:clone(replicas),
    target_backend:'postgresql-compatible',
    firestore_independence:'IN_PROGRESS',
    generated_at:now()
  }
}

export function createDualWriteAdapter({primary,secondary,journal}={}){
  if(!primary||!secondary)throw new TypeError('primary and secondary required')
  return {
    async put(namespace,id,data,actor='system'){
      const before=await primary.get(namespace,id)
      const next=createStateRecord({namespace,id,data,version:Number(before?.version||0)+1})
      await primary.put(next)
      let secondaryError=null
      try{await secondary.put(next)}catch(error){secondaryError=error}
      const entry=createJournalEntry({namespace,id,operation:'PUT',before,after:next,actor})
      if(journal)await journal.append(entry)
      return {record:next,secondary_ok:!secondaryError,secondary_error:secondaryError?String(secondaryError.message||secondaryError):null,journal:entry}
    },
    async get(namespace,id,{compare=true}={}){
      const a=await primary.get(namespace,id)
      if(!compare)return {record:a}
      const b=await secondary.get(namespace,id)
      return {record:a,comparison:compareRecords(a,b),secondary:b}
    },
    async delete(namespace,id,actor='system'){
      const before=await primary.get(namespace,id)
      await primary.delete(namespace,id)
      let secondaryError=null
      try{await secondary.delete(namespace,id)}catch(error){secondaryError=error}
      const entry=createJournalEntry({namespace,id,operation:'DELETE',before,after:null,actor})
      if(journal)await journal.append(entry)
      return {secondary_ok:!secondaryError,journal:entry}
    }
  }
}

export function createMemoryStateBackend(){
  const map=new Map(),key=(n,id)=>`${n}::${id}`
  return {
    async get(n,id){return clone(map.get(key(n,id))||null)},
    async put(record){map.set(key(record.namespace,record.id),clone(record));return clone(record)},
    async delete(n,id){map.delete(key(n,id));return true},
    async list(n){return [...map.values()].filter(x=>x.namespace===n).map(clone)}
  }
}

export function createMemoryJournal(){
  const rows=[]
  return {async append(e){rows.push(clone(e));return e},async list(){return rows.map(clone)}}
}
