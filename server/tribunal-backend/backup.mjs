import {copyFileSync,existsSync,mkdirSync} from 'node:fs'
import {dirname,resolve} from 'node:path'

const source=resolve(process.cwd(),process.env.NEO_TRIBUNAL_DB||'.data/neo-tribunal.sqlite')
if(!existsSync(source))throw new Error(`Tribunal database not found: ${source}`)
const target=resolve(process.cwd(),process.argv[2]||`.backups/neo-tribunal-${new Date().toISOString().replaceAll(':','-')}.sqlite`)
mkdirSync(dirname(target),{recursive:true})
copyFileSync(source,target)
console.log(target)
