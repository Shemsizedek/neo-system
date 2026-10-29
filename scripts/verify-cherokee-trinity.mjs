import { readPartnerManifest } from '../server/neo-tokenworks/partner-bridge.mjs';
import { verifyCheckoutSource, verifyLiveSource } from '../integrations/cherokee-trinity/source-verifier.mjs';

const args = process.argv.slice(2);
try {
  let report;
  if (args.length === 1 && args[0] === '--live') report = await verifyLiveSource(readPartnerManifest());
  else if (args.length === 2 && args[0] === '--checkout') report = await verifyCheckoutSource(readPartnerManifest(), args[1]);
  else throw new Error('Usage: node scripts/verify-cherokee-trinity.mjs --live | --checkout <partner-repo-path>');
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message, deploymentVerified: false, financialActivationEnabled: false }));
  process.exitCode = 1;
}
