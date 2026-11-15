#!/usr/bin/env node
/** Offline adapter for HCAD TSV + separately authorized/matched probate CSV. */
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildEstatePilot } from '../server/neo-crawler/estate-sourcing.mjs';

export function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    if (!['--hcad', '--case-links', '--out', '--as-of', '--limit'].includes(key) || !argv[i + 1] || flags[key]) throw new Error('invalid_arguments');
    flags[key] = argv[i + 1];
  }
  if (!flags['--hcad'] || !flags['--case-links'] || !flags['--out']) throw new Error('input_and_output_paths_required');
  return flags;
}

export async function runCli(argv) {
  const flags = parseArgs(argv);
  const report = await buildEstatePilot({
    propertyPath: flags['--hcad'], caseLinksPath: flags['--case-links'],
    snapshotAt: flags['--as-of'], maxCandidates: flags['--limit'] ? Number(flags['--limit']) : 100,
  });
  // Local output only. Do not commit this output: addresses and probate references may identify people.
  await writeFile(flags['--out'], JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  return { gate: report.gate, output_written: true, counts: report.counts, production_import_permitted: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).then(s => {
    process.stdout.write(JSON.stringify(s) + '\n');
  }).catch(e => {
    process.stderr.write('NEO estate pilot blocked: ' + (e.code === 'EEXIST' ? 'output_exists' : /^\w+(?:_at_\d+)?$/.test(e.message) ? e.message : 'input_or_output_error') + '\n');
    process.exitCode = 1;
  });
}
