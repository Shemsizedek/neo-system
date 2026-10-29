import { readFile } from 'node:fs/promises';
import { readPartnerManifest } from '../server/neo-tokenworks/partner-bridge.mjs';
import { buildRetokenizationPlan, reconcileRetokenization } from '../server/neo-tokenworks/retokenization.mjs';
import { readCounterpartyPreflight } from '../integrations/cherokee-trinity/counterparty-preflight.mjs';

const args = process.argv.slice(2);
try {
  let report;
  if (args.length === 1 && args[0] === '--plan') report = buildRetokenizationPlan(readPartnerManifest());
  else if (args.length === 1 && args[0] === '--preflight') report = await readCounterpartyPreflight();
  else if (args.length === 2 && args[0] === '--reconcile') report = reconcileRetokenization(readPartnerManifest(), JSON.parse(await readFile(args[1], 'utf8')));
  else throw new Error('Usage: node scripts/cherokee-retokenization.mjs --plan | --preflight | --reconcile <quantities.json>');
  console.log(JSON.stringify(report, null, 2));
  if (report.ok === false || report.mathConsistent === false) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message, executionEnabled: false }));
  process.exitCode = 1;
}
