export function createPostgresStateBackend({query}={}){
  if(typeof query!=='function')throw new TypeError('query function required')
  return {
    async get(namespace,id){
      const r=await query('SELECT namespace,id,data,version,updated_at,digest FROM neo_state_records WHERE namespace=$1 AND id=$2',[namespace,id])
      return r.rows?.[0]||null
    },
    async put(record){
      const r=await query(`INSERT INTO neo_state_records(namespace,id,data,version,updated_at,digest)
VALUES($1,$2,$3::jsonb,$4,$5,$6)
ON CONFLICT(namespace,id) DO UPDATE SET data=EXCLUDED.data,version=EXCLUDED.version,updated_at=EXCLUDED.updated_at,digest=EXCLUDED.digest
RETURNING namespace,id,data,version,updated_at,digest`,[record.namespace,record.id,JSON.stringify(record.data),record.version,record.updated_at,record.digest])
      return r.rows?.[0]||record
    },
    async delete(namespace,id){await query('DELETE FROM neo_state_records WHERE namespace=$1 AND id=$2',[namespace,id]);return true},
    async list(namespace){const r=await query('SELECT namespace,id,data,version,updated_at,digest FROM neo_state_records WHERE namespace=$1 ORDER BY updated_at DESC',[namespace]);return r.rows||[]}
  }
}

export function createPostgresJournal({query}={}){
  if(typeof query!=='function')throw new TypeError('query function required')
  return {
    async append(entry){
      await query(`INSERT INTO neo_state_journal(journal_id,namespace,id,operation,sequence,before_data,after_data,actor,digest,recorded_at)
VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10)`,[
        entry.journal_id,entry.namespace,entry.id,entry.operation,entry.sequence,
        entry.before?JSON.stringify(entry.before):null,entry.after?JSON.stringify(entry.after):null,
        entry.actor,entry.digest,entry.recorded_at
      ])
      return entry
    }
  }
}
