import {copyFileSync,existsSync,mkdirSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {DatabaseSync} from 'node:sqlite'

const source=resolve(process.cwd(),process.env.NEO_TRIBUNAL_DB||'.data/neo-tribunal.sqlite')
if(!existsSync(source))throw new Error(`Tribunal database not found: ${source}`)
const target=resolve(process.cwd(),process.argv[2]||`.backups/neo-tribunal-${new Date().toISOString().replaceAll(':','-')}.sqlite`)
mkdirSync(dirname(target),{recursive:true})
const live=new DatabaseSync(source);live.exec('PRAGMA wal_checkpoint(FULL)');live.close()
copyFileSync(source,target)
const backup=new DatabaseSync(target);const integrity=backup.prepare('PRAGMA integrity_check').get();const schema=backup.prepare('SELECT MAX(version) AS version FROM schema_meta').get()?.version||0;backup.close()
if(integrity.integrity_check!=='ok')throw new Error(`Backup integrity check failed: ${integrity.integrity_check}`)
console.log(JSON.stringify({ok:true,target,schema,verifiedAt:new Date().toISOString()}))
