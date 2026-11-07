import { readFile,stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectVmStagingReadiness } from '../server/neo-vm/staging-readiness.mjs'

// Takes a private operator evidence snapshot. Emits checks only; never echoes
// infrastructure objects, account metadata, device records or credentials.
export async function runVmStagingPreflight(filename){
 if(typeof filename!=='string'||(await stat(filename)).size>100_000)throw Error('VM_STAGING_EVIDENCE_REQUIRED')
 const result=inspectVmStagingReadiness(JSON.parse(await readFile(filename,'utf8')))
 process.stdout.write(JSON.stringify(result,null,2)+'\n')
 return result
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))runVmStagingPreflight(process.argv[2])
 .then(r=>{if(r.status!=='READY_FOR_REGTEST_REVIEW')process.exitCode=2}).catch(()=>{process.stderr.write('VM_STAGING_EVIDENCE_INVALID\n');process.exitCode=1})
