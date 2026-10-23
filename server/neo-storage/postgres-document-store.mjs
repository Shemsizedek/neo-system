// HOSTING-005: PostgreSQL JSONB document adapter. Inject a pg-compatible Pool;
// this module never connects or switches production storage on import.
const ident = value => {
  if (typeof value !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,127}$/.test(value)) throw new Error('invalid_document_identifier');
  return value;
};
const copy = value => structuredClone(value);
export function createPostgresDocumentStore({pool,table='neo_documents'}={}) {
  if (!pool || typeof pool.query !== 'function') throw new Error('postgres_pool_required');
  if (!/^[a-z_][a-z0-9_]*$/.test(table)) throw new Error('invalid_table_name');
  const q = '"'+table+'"';
  async function init() {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${q} (collection TEXT NOT NULL, id TEXT NOT NULL, body JSONB NOT NULL, version BIGINT NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(collection,id))`);
  }
  async function get(collection,id) {
    ident(collection); ident(id);
    const result=await pool.query(`SELECT body,version FROM ${q} WHERE collection=$1 AND id=$2`,[collection,id]);
    const row=result.rows[0];
    return row?{id,version:Number(row.version),value:copy(row.body)}:null;
  }
  async function put(collection,id,value,{expectedVersion}={}) {
    ident(collection); ident(id);
    if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('document_object_required');
    if (expectedVersion!==undefined && (!Number.isSafeInteger(expectedVersion)||expectedVersion<0)) throw new Error('invalid_expected_version');
    let result;
    if(expectedVersion===undefined) {
      result=await pool.query(`INSERT INTO ${q}(collection,id,body) VALUES($1,$2,$3::jsonb) ON CONFLICT(collection,id) DO UPDATE SET body=EXCLUDED.body,version=${q}.version+1,updated_at=now() RETURNING version`,[collection,id,JSON.stringify(value)]);
    } else if(expectedVersion===0) {
      result=await pool.query(`INSERT INTO ${q}(collection,id,body) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING RETURNING version`,[collection,id,JSON.stringify(value)]);
    } else {
      result=await pool.query(`UPDATE ${q} SET body=$3::jsonb,version=version+1,updated_at=now() WHERE collection=$1 AND id=$2 AND version=$4 RETURNING version`,[collection,id,JSON.stringify(value),expectedVersion]);
    }
    if(!result.rows.length)throw new Error('document_version_conflict');
    return {id,version:Number(result.rows[0].version)};
  }
  async function list(collection,{cursor='',limit=50}={}) {
    ident(collection);
    if(cursor)ident(cursor);
    if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw new Error('invalid_list_limit');
    const result=await pool.query(`SELECT id,body,version FROM ${q} WHERE collection=$1 AND id>$2 ORDER BY id LIMIT $3`,[collection,cursor,limit+1]);
    const rows=result.rows.slice(0,limit).map(r=>({id:r.id,version:Number(r.version),value:copy(r.body)}));
    return {rows,nextCursor:result.rows.length>limit?rows.at(-1).id:null};
  }
  return {init,get,put,list};
}
