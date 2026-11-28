#!/usr/bin/env node
/** Safe local-file schema preflight for 2026 HCAD real_acct.txt. No network. */
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { inspectHcadLocalFile } from '../server/neo-crawler/estate-source-preflight.mjs';

export async function runHcadPreflightCli(argv) {
  const flags = {};
  for (let i=0;i<argv.length;i+=2) {
    const name=argv[i];
    if (!['--hcad','--out','--year','--sample'].includes(name) || flags[name] || !argv[i+1]) throw new Error('invalid_arguments');
    flags[name]=argv[i+1];
  }
  if (!flags['--hcad'] || !flags['--out']) throw new Error('hcad_and_output_required');
  const result=await inspectHcadLocalFile({path:flags['--hcad'],
    expectedYear:flags['--year']||'2026', sampleLimit:flags['--sample'] ? Number(flags['--sample']) : 50});
  await writeFile(flags['--out'],JSON.stringify(result,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
  return {gate:result.gate,status:result.classification,source_authenticity_verified:false,
    production_import_permitted:false,sampled:result.sample.rows_sampled};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runHcadPreflightCli(process.argv.slice(2)).then(x=>process.stdout.write(JSON.stringify(x)+'\n')).catch(e=>{
    process.stderr.write('NEO estate source preflight: '+(e.code==='EEXIST'?'output_exists':'blocked')+'\n');
    process.exitCode=1;
  });
}
