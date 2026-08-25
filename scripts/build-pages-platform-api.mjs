import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const generatedAt = new Date().toISOString();
const commit = process.env.GITHUB_SHA || 'local';
const base = 'https://shemsizedek.github.io/neo-system';

const platforms = {
  neopay: {
    name: 'NEOpay',
    category: 'wallet-exchange',
    source: 'apps/neopay + src/neopay',
    capabilities: [
      { name: 'Wallet portfolio reads', mode: 'pages-read / server-ready' },
      { name: 'Transaction composition', mode: 'user-controlled signing' },
      { name: 'Counterparty market integration', mode: 'server/chain adapter' }
    ]
  },
  'neo-teller': {
    name: 'NEO Teller',
    category: 'atm-banking-terminal',
    source: 'server/neo-teller-backend',
    capabilities: [
      { name: 'ATM session/status', mode: 'server-backed' },
      { name: 'Deposit/withdrawal orchestration', mode: 'authenticated server' },
      { name: 'World-currency quote contract', mode: 'provider adapter' }
    ]
  },
  'neo-books': {
    name: 'NEO Books',
    category: 'accounting-ledger',
    source: 'src/books',
    capabilities: [
      { name: 'Chart of accounts schema', mode: 'pages-read' },
      { name: 'Ledger/journal engine', mode: 'server-ready' },
      { name: 'Treasury reporting', mode: 'server-ready' }
    ]
  },
  'neo-prime': {
    name: 'NEO Prime',
    category: 'market-intelligence',
    source: 'server/neo-prime',
    capabilities: [
      { name: 'Market intelligence runtime', mode: 'implemented runtime' },
      { name: 'Issuer/evidence analytics', mode: 'server-ready' },
      { name: 'Quote and signal feeds', mode: 'provider adapter' }
    ]
  },
  'neo-exchange': {
    name: 'NEO Exchange',
    category: 'counterparty-dex',
    source: 'neo-system market stack',
    capabilities: [
      { name: 'Order discovery contract', mode: 'pages-read / adapter-ready' },
      { name: 'Counterparty DEX routing', mode: 'server/chain adapter' },
      { name: 'User-authorized settlement', mode: 'signing required' }
    ]
  },
  'neo-generator': {
    name: 'NEO Generator',
    category: 'mining-contract-orchestration',
    source: 'server/miner-generator',
    capabilities: [
      { name: 'Generator product catalog', mode: 'pages-read' },
      { name: 'Hashpower contract orchestration', mode: 'server-backed' },
      { name: 'Payment/settlement adapter', mode: 'authenticated server' }
    ]
  },
  'neo-miner': {
    name: 'NEO Miner',
    category: 'bitcoin-mining-control-plane',
    source: 'src/miner + server/miner-*',
    capabilities: [
      { name: 'Miner fleet telemetry', mode: 'agent/controller' },
      { name: 'Mining job orchestration', mode: 'server-backed' },
      { name: 'Commerce integration', mode: 'server-backed' }
    ]
  }
};

const outDir = join(process.cwd(), 'dist', 'api', 'platforms');
await mkdir(outDir, { recursive: true });

for (const [slug, platform] of Object.entries(platforms)) {
  const payload = {
    apiVersion: '2026-08-25.v1',
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
    capabilities: platform.capabilities,
    limits: {
      readOnly: true,
      transactionalWrites: false,
      note: 'GitHub Pages is static hosting. Sensitive writes, signing and financial execution require authenticated runtime services.'
    }
  };
  await writeFile(join(outDir, `${slug}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

await writeFile(
  join(outDir, 'index.json'),
  `${JSON.stringify({ apiVersion: '2026-08-25.v1', status: 'ready', generatedAt, commit, platforms: Object.keys(platforms).map(slug => `${base}/api/platforms/${slug}.json`) }, null, 2)}\n`,
  'utf8'
);

console.log(`Published ${Object.keys(platforms).length} NEO platform API snapshots.`);
