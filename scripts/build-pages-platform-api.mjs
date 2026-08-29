import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const generatedAt = new Date().toISOString();
const commit = process.env.GITHUB_SHA || 'local';
const base = 'https://shemsizedek.github.io/neo-system';
const checkout = {
  provider: 'neo-counter',
  route: `${base}/neo-counter/`,
  adapter: `${base}/neo-counter/neo-checkout.js`,
  integrations: `${base}/api/neo-counter/integrations.json`,
  currencies: `${base}/api/neo-counter/currencies.json`,
  intentVersion: '1',
  settlementProof: 'blockchain-reference-required'
};

const platforms = {
  neopay: { name: 'NEOpay', category: 'wallet-exchange', source: 'apps/neopay + src/neopay', capabilities: [
    { name: 'Wallet portfolio reads', mode: 'pages-read / server-ready' },
    { name: 'Transaction composition', mode: 'user-controlled signing' },
    { name: 'Counterparty market integration', mode: 'server/chain adapter' }
  ]},
  'neo-teller': { name: 'NEO Teller', category: 'atm-banking-terminal', source: 'server/neo-teller-backend', capabilities: [
    { name: 'ATM session/status', mode: 'server-backed' },
    { name: 'Deposit/withdrawal orchestration', mode: 'authenticated server' },
    { name: 'World-currency quote contract', mode: 'provider adapter' }
  ]},
  'neo-books': { name: 'NEO Books', category: 'accounting-ledger', source: 'src/books', capabilities: [
    { name: 'Chart of accounts schema', mode: 'pages-read' },
    { name: 'Ledger/journal engine', mode: 'server-ready' },
    { name: 'Treasury reporting', mode: 'server-ready' }
  ]},
  'neo-prime': { name: 'NEO Prime', category: 'market-intelligence', source: 'server/neo-prime', capabilities: [
    { name: 'Market intelligence runtime', mode: 'implemented runtime' },
    { name: 'Issuer/evidence analytics', mode: 'server-ready' },
    { name: 'Quote and signal feeds', mode: 'provider adapter' }
  ]},
  'neo-exchange': { name: 'NEO Exchange', category: 'counterparty-dex', source: 'neo-system market stack', capabilities: [
    { name: 'Order discovery contract', mode: 'pages-read / adapter-ready' },
    { name: 'Counterparty DEX routing', mode: 'server/chain adapter' },
    { name: 'User-authorized settlement', mode: 'signing required' }
  ]},
  'neo-generator': { name: 'NEO Generator', category: 'mining-contract-orchestration', source: 'server/miner-generator', capabilities: [
    { name: 'Generator product catalog', mode: 'pages-read' },
    { name: 'Hashpower contract orchestration', mode: 'server-backed' },
    { name: 'Payment/settlement adapter', mode: 'neo-counter checkout' }
  ]},
  'neo-miner': { name: 'NEO Miner', category: 'bitcoin-mining-control-plane', source: 'src/miner + server/miner-*', capabilities: [
    { name: 'Miner fleet telemetry', mode: 'agent/controller' },
    { name: 'Mining job orchestration', mode: 'server-backed' },
    { name: 'Commerce integration', mode: 'neo-counter checkout' }
  ]},
  'neo-wire': { name: 'NEO Wire', category: 'telecommunications-routing', source: 'neo-system communications stack', capabilities: [
    { name: 'Service activation checkout', mode: 'neo-counter checkout' },
    { name: 'Telecommunications orchestration', mode: 'router/service adapter' }
  ]},
  noogle: { name: 'Noogle', category: 'search-finance-discovery', source: 'apps/noogle', capabilities: [
    { name: 'Service/product discovery', mode: 'pages-read' },
    { name: 'Checkout handoff', mode: 'neo-counter checkout' }
  ]},
  neoscan: { name: 'NEOscan', category: 'explorer-accounting', source: 'apps/neoscan', capabilities: [
    { name: 'Blockchain and statement verification', mode: 'pages-read' },
    { name: 'Checkout settlement reference verification', mode: 'read-only chain verification' }
  ]},
  'neo-enterprise': { name: 'NEO Enterprise', category: 'enterprise-services', source: 'docs/neo-enterprise', capabilities: [
    { name: 'Enterprise service directory', mode: 'pages-read' },
    { name: 'Service checkout handoff', mode: 'neo-counter checkout' }
  ]},
  'neo-counter': { name: 'NEO Counter', category: 'checkout-pos-gateway', source: 'apps/neo-counter', capabilities: [
    { name: 'Shared checkout intent', mode: 'github-pages frontend' },
    { name: 'Treasury World Currency catalog', mode: 'github snapshot registry' },
    { name: 'Settlement observation', mode: 'read-only BTC/Counterparty rails' }
  ]}
};

const outDir = join(process.cwd(), 'dist', 'api', 'platforms');
await mkdir(outDir, { recursive: true });

for (const [slug, platform] of Object.entries(platforms)) {
  const payload = {
    apiVersion: '2026-08-29.v2',
    platform: slug,
    name: platform.name,
    category: platform.category,
    status: 'ready',
    transport: 'github-pages-static-read-api',
    generatedAt,
    commit,
    page: `${base}/${slug}/`,
    self: `${base}/api/platforms/${slug}.json`,
    source: platform.source,
    checkout: { ...checkout, serviceId: slug },
    capabilities: platform.capabilities,
    limits: {
      readOnly: true,
      transactionalWrites: false,
      note: 'GitHub Pages publishes status, routing and checkout discovery data. Signing and financial execution remain user-authorized.'
    }
  };
  await writeFile(join(outDir, `${slug}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

await writeFile(join(outDir, 'index.json'), `${JSON.stringify({ apiVersion: '2026-08-29.v2', status: 'ready', generatedAt, commit, checkout, platforms: Object.keys(platforms).map(slug => `${base}/api/platforms/${slug}.json`) }, null, 2)}\n`, 'utf8');

const routerOut = join(process.cwd(), 'dist', 'api', 'router');
await mkdir(routerOut, { recursive: true });
await copyFile(join(process.cwd(), 'data', 'router', 'providers.json'), join(routerOut, 'providers.json'));
await copyFile(join(process.cwd(), 'data', 'router', 'state.json'), join(routerOut, 'state.json'));
await writeFile(join(routerOut, 'index.json'), `${JSON.stringify({ apiVersion: '2026-08-29.v2', status: 'ready', source: 'github', generatedAt, commit, checkout, providers: `${base}/api/router/providers.json`, state: `${base}/api/router/state.json` }, null, 2)}\n`, 'utf8');

await import('./build-neo-market-snapshot.mjs');
console.log(`Published ${Object.keys(platforms).length} NEO platform API snapshots with NEO Counter checkout discovery.`);
