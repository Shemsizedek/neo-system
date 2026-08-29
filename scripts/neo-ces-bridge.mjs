import { createCesAdapter } from '../apps/neoscan/adapters/ces/adapter.mjs';

const mode = String(process.env.NEO_CES_MODE || 'status').trim();
const endpoint = String(process.env.CES_ENDPOINT || '').trim();
const network = String(process.env.CES_NETWORK || '').trim();
const account = String(process.env.CES_ACCOUNT || '').trim();
const token = String(process.env.CES_API_TOKEN || '').trim();

const adapter = createCesAdapter({ endpoint, network, account, authMode: 'bearer' });

const baseStatus = {
  service: 'neo-ces-bridge',
  controlPlane: 'discord-primary',
  runtimeDependency: 'none',
  cloudflareRequired: false,
  readOnly: true,
  mode,
  adapter: adapter.status()
};

if (mode === 'status') {
  console.log(JSON.stringify({
    ...baseStatus,
    state: adapter.status().configured ? 'CONFIGURED' : 'READY_FOR_AUTHORIZED_CONNECTION',
    note: 'Current public CES is session-based. API mode is opt-in only when an authorized CES-compatible API endpoint is available.'
  }, null, 2));
  process.exit(0);
}

if (mode !== 'api-readonly') {
  throw new Error(`Unsupported NEO_CES_MODE: ${mode}`);
}

if (!endpoint || !account || !token) {
  throw new Error('api-readonly requires CES_ENDPOINT, CES_ACCOUNT, and CES_API_TOKEN secrets');
}

const [balance, transactions] = await Promise.all([
  adapter.getBalance({ token }),
  adapter.getTransactions({ token, limit: 25 })
]);

console.log(JSON.stringify({
  ...baseStatus,
  state: 'LIVE_READONLY',
  balance,
  transactionCount: transactions.length,
  latestTransactions: transactions
}, null, 2));
