import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {Pool} from 'pg'

const here=path.dirname(fileURLToPath(import.meta.url))
const migrations=[
  path.resolve(here,'../schema/relations.sql'),
  path.resolve(here,'../schema/002_controlled_operations.sql')
]

if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==='disable'?false:{rejectUnauthorized:false}})

try{
  await pool.query(`CREATE TABLE IF NOT EXISTS relations_schema_migrations(
    migration_name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`)
  for(const file of migrations){
    const name=path.basename(file)
    const done=await pool.query('SELECT 1 FROM relations_schema_migrations WHERE migration_name=$1',[name])
    if(done.rowCount) continue
    const sql=await fs.readFile(file,'utf8')
    await pool.query('BEGIN')
    try{
      await pool.query(sql)
      await pool.query('INSERT INTO relations_schema_migrations(migration_name) VALUES($1)',[name])
      await pool.query('COMMIT')
      console.log(`applied ${name}`)
    }catch(err){
      await pool.query('ROLLBACK')
      throw err
    }
  }
}finally{
  await pool.end()
}
