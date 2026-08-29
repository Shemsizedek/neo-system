import { mkdir, readFile, writeFile } from 'node:fs/promises';

const runtimeSource = new URL('../data/neo-counter/runtime.json', import.meta.url);
const servicesSource = new URL('../data/neo-counter/ecosystem-services.json', import.meta.url);
const integrationsSource = new URL('../data/neo-counter/integrations.json', import.meta.url);
const currenciesSource = new URL('../data/neo-counter/world-currencies.csv', import.meta.url);
const outDir = new URL('../dist/api/neo-counter/', import.meta.url);

await mkdir(outDir, { recursive: true });
const runtime = JSON.parse(await readFile(runtimeSource, 'utf8'));
const services = JSON.parse(await readFile(servicesSource, 'utf8'));
const integrations = JSON.parse(await readFile(integrationsSource, 'utf8'));
const generatedAt = new Date().toISOString();
const commit = process.env.GITHUB_SHA || 'local';

const csv = await readFile(currenciesSource, 'utf8');
const rows = csv.trim().split(/\r?\n/).slice(1).filter(Boolean);
const counts = new Map();
const currencies = rows.map(row => {
  const [symbol, name, counterpartyAsset = ''] = row.split(',');
  const count = (counts.get(symbol) || 0) + 1;
  counts.set(symbol, count);
  return {
    id: count === 1 ? symbol.toLowerCase() : `${symbol.toLowerCase()}-${count}`,
    symbol,
    name,
    counterpartyAsset: counterpartyAsset || null,
    checkoutEligible: true,
    mappingStatus: counterpartyAsset ? 'verified' : 'published-symbol-needs-onchain-asset-map'
  };
});

const currencyPayload = {
  schemaVersion: '2026-08-29.v1',
  treasuryWallet: '18FyntJG9hdXYvanm67mGgbyo1P7adckvg',
  source: 'https://worldcurrency.finance.blog/',
  sourceClassification: 'published World Currency catalog',
  generatedAt,
  commit,
  note: 'Published symbols and names are preserved exactly, including duplicate symbols. Except BTC, XCP and NOMNI, symbols are not assumed to equal Counterparty on-chain asset names until independently mapped.',
  currencies
};

await writeFile(new URL('runtime.json', outDir), JSON.stringify({ ...runtime, generatedAt, commit }, null, 2) + '\n');
await writeFile(new URL('services.json', outDir), JSON.stringify({ ...services, generatedAt, commit }, null, 2) + '\n');
await writeFile(new URL('integrations.json', outDir), JSON.stringify({ ...integrations, generatedAt, commit }, null, 2) + '\n');
await writeFile(new URL('currencies.json', outDir), JSON.stringify(currencyPayload, null, 2) + '\n');
await writeFile(new URL('build.json', outDir), JSON.stringify({
  service: 'neo-counter',
  source: 'GitHub Actions',
  backend: 'GitHub repository snapshots',
  frontend: 'GitHub Pages',
  checkoutGateway: true,
  checkoutRoute: '/neo-counter/',
  servicesManifest: '/api/neo-counter/services.json',
  integrationsManifest: '/api/neo-counter/integrations.json',
  currenciesManifest: '/api/neo-counter/currencies.json',
  treasuryWallet: currencyPayload.treasuryWallet,
  supportedCurrencyEntries: currencies.length,
  commit,
  generatedAt,
  writable: false,
  localFirst: true
}, null, 2) + '\n');

console.log(`NEO Counter GitHub backend snapshot built for ${commit} with ${currencies.length} World Currency entries`);
