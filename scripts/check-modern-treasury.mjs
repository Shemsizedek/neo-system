import { pathToFileURL } from 'node:url';
import { createModernTreasuryConnector, ModernTreasuryError } from '../server/neo-merchant-treasury/modern-treasury.mjs';

export async function checkModernTreasury({ connector = createModernTreasuryConnector(), includeAccounts = false } = {}) {
  const connection = await connector.verifyConnection();
  return includeAccounts ? { connection, account_page: await connector.listInternalAccounts() } : { connection };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--accounts')) throw new ModernTreasuryError('modern_treasury_invalid_cli_argument', 400);
    console.log(JSON.stringify(await checkModernTreasury({ includeAccounts: args.includes('--accounts') }), null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      provider: 'modern-treasury', verified: false, read_only: true, payment_execution_enabled: false,
      error: error instanceof ModernTreasuryError ? error.code : 'modern_treasury_check_failed'
    }));
    process.exitCode = 1;
  }
}
