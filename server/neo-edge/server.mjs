import http from 'node:http';
import { URL } from 'node:url';
import { searchPublicLibrary, libraryCatalog, health as libraryHealth } from '../holytemples-adapter/adapter.mjs';
import { createFirestoreRestDb } from '../neo-counter-backend/firestore-rest-db.mjs';

const PORT = Number(process.env.PORT || 8080);
const TREASURY_WALLET = '18FyntJG9hdXYvanm67mGgbyo1P7adckvg';
const FIRESTORE_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || '(default)';
const TOKENSCAN_NOMNI_URL = 'https://tokenscan.io/api/asset/NOMNI';
const NOMNI_FALLBACK_VALUE = Object.freeze({ usd: '20.72', xcp: '13.03076220', btc: null });
let nomniValueCache = null;

const NOMNI = Object.freeze({
  success: true,
  asset: 'NOMNI',
  symbol: '∞',
  display_name: 'NOMNI Infinity Dollar',
  network: 'bitcoin-counterparty',
  asset_issuer_address: '1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk',
  asset_owner_address: TREASURY_WALLET,
  asset_supply: '900000000',
  asset_divisible: false,
  asset_locked: true,
  treasury_wallet: TREASURY_WALLET,
  canonical_url: 'https://nomni.holytemples.org/nomni.json',
  world_currency_url: 'https://holytemples.org/world-currency/',
  external_reference: 'https://xcp.coindaddy.io/NOMNI.json',
  valuation_url: 'https://nomni.holytemples.org/api/nomni/value',
  valuation_policy: 'Market-observed value, not a guaranteed redemption peg.',
  integration: {
    format: 'NEO Asset Contract v1',
    plug_and_play: true,
    settlement_address: TREASURY_WALLET,
    supported_surfaces: ['website','app','webapp','software','device','pos','server'],
    discovery: ['/nomni.json','/api/nomni','/api/nomni/value','/api/wallet','/api/treasury']
  }
});

const TREASURY = Object.freeze({
  name: 'World Treasury',
  wallet: TREASURY_WALLET,
  networks: ['bitcoin','counterparty'],
  settlementAssetFamily: ['BTC','XCP','NOMNI','NEOCASH'],
  policy: 'Enabled NEO settlement instructions reference the Treasury wallet unless a service-specific approved contract overrides it.',
  privateKeysExposed: false
});

const SCAN_CONFIG = Object.freeze({
  name: 'NEO Scan',
  presentationBaseAsset: 'NEOCASH',
  protocol: 'Counterparty on Bitcoin',
  counterpartyNativeBaseAsset: 'XCP',
  mode: 'application-adapter',
  wrappingStatus: 'No on-chain XCP-to-NEOCASH wrapper is claimed by this API. NEOCASH is the NEO-facing presentation/quote layer until an explicit wrapper contract is deployed.',
  treasuryWallet: TREASURY_WALLET
});

const CES_CONFIG = Object.freeze({
  name: 'NEO Bank',
  system: 'Community Exchange System',
  host: 'neobank.holytemples.org',
  role: 'community-ces',
  walletEntry: 'https://pay.holytemples.org',
  settlement: 'NEOpay Bitcoin / Counterparty wallet',
  currencySymbol: '∞',
  database: 'Google Cloud Firestore',
  databaseId: FIRESTORE_DATABASE_ID,
  browserPrivateKeys: false,
  policy: 'NEO Bank provides CES/community access. Bitcoin and Counterparty wallet recovery and signing belong to NEOpay.'
});

const SERVICES = Object.freeze({
  'neo.holytemples.org': { id: 'neo-system', name: 'NEO System', role: 'system', api: true },
  'router.holytemples.org': { id: 'neo-router', name: 'NEO Router', role: 'router', api: true },
  'algo.holytemples.org': { id: 'neo-algo', name: 'NEO Algo', role: 'intelligence', api: true },
  'prime.holytemples.org': { id: 'neo-prime', name: 'NEO Prime', role: 'orchestrator', api: true },
  'pay.holytemples.org': { id: 'neopay', name: 'NEO Pay', role: 'payments-wallet-entry', api: true },
  'neobank.holytemples.org': { id: 'neo-bank', name: 'NEO Bank', role: 'community-ces', api: true },
  'hub.holytemples.org': { id: 'neo-hub', name: 'NEO Hub', role: 'hub', api: true },
  'counter.holytemples.org': { id: 'neo-counter', name: 'NEO Counter', role: 'commerce', api: true },
  'wire.holytemples.org': { id: 'neo-wire', name: 'NEO Wire', role: 'wire', api: true },
  'neogram.holytemples.org': { id: 'neogram', name: 'NEO Telegram', role: 'communications', api: true },
  'neofx.holytemples.org': { id: 'neofx', name: 'NEOfx', role: 'exchange', api: true },
  'scan.holytemples.org': { id: 'neoscan', name: 'NEO Scan', role: 'explorer', api: true },
  'school.holytemples.org': { id: 'gisd', name: 'GISD', role: 'education', api: true },
  'library.holytemples.org': { id: 'neo-library', name: 'NEO Library', role: 'library', api: true },
  'book.holytemples.org': { id: 'neo-books', name: 'NEO Books', role: 'books', api: true },
  'neopads.holytemples.org': { id: 'neo-pads', name: 'NEO Pads', role: 'hospitality', api: true },
  'neopass.holytemples.org': { id: 'neopass', name: 'NEO Pass', role: 'identity', api: true },
  'neovision.holytemples.org': { id: 'neo-tv', name: 'NEO TV', role: 'media', api: true },
  'noogle.holytemples.org': { id: 'noogle', name: 'Noogle', role: 'search', api: true },
  'omnitrix.holytemples.org': { id: 'omnitrix', name: 'Omnitrix', role: 'browser', api: true },
  'neodash.holytemples.org': { id: 'neo-dash', name: 'NEO Dash', role: 'dashboard', api: true },
  'nomni.holytemples.org': { id: 'nomni', name: 'N.O.M.N.I.', role: 'currency', api: true },
  'wallet.holytemples.org': { id: 'neo-treasury-wallet', name: 'NEO Treasury Wallet', role: 'wallet', api: true },
  'treasury.holytemples.org': { id: 'world-treasury', name: 'World Treasury', role: 'treasury', api: true }
});

const PUBLIC_ORIGINS = new Set([
  'https://holytemples.org',
  'https://www.holytemples.org',
  ...Object.keys(SERVICES).map(host => `https://${host}`)
]);

function hostOf(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && PUBLIC_ORIGINS.has(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
    res.setHeader('access-control-allow-methods', 'GET,OPTIONS');
    res.setHeader('access-control-allow-headers', 'Accept,Content-Type,Authorization');
  }
}

function json(req, res, status, body) {
  cors(req, res);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=30' : 'no-store'
  });
  res.end(JSON.stringify(body));
}

function serviceSnapshot(host) {
  const service = SERVICES[host];
  return service ? { ...service, host, url: `https://${host}` } : null;
}

async function getNomniValuation() {
  const now = Date.now();
  if (nomniValueCache && now - nomniValueCache.cachedAt < 60_000) return nomniValueCache.value;
  let value;
  try {
    const response = await fetch(TOKENSCAN_NOMNI_URL, { signal: AbortSignal.timeout(4500), headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`tokenscan_http_${response.status}`);
    const asset = await response.json();
    const estimated = asset?.estimated_value || {};
    value = {
      asset: 'NOMNI', symbol: '∞', unit: '1 NOMNI',
      usd: String(estimated.usd ?? NOMNI_FALLBACK_VALUE.usd),
      xcp: estimated.xcp == null ? NOMNI_FALLBACK_VALUE.xcp : String(estimated.xcp),
      btc: estimated.btc == null ? NOMNI_FALLBACK_VALUE.btc : String(estimated.btc),
      mode: 'market-observed', source: TOKENSCAN_NOMNI_URL,
      observedAt: new Date().toISOString(), guaranteedPeg: false
    };
  } catch (error) {
    value = {
      asset: 'NOMNI', symbol: '∞', unit: '1 NOMNI', ...NOMNI_FALLBACK_VALUE,
      mode: 'market-observed-fallback', source: 'CoinDaddy/TokenScan last-known snapshot',
      observedAt: new Date().toISOString(), guaranteedPeg: false,
      upstreamStatus: String(error?.message || error)
    };
  }
  nomniValueCache = { cachedAt: now, value };
  return value;
}

async function databaseHealth() {
  if (!FIRESTORE_PROJECT_ID) return { connected: false, provider: 'firestore', databaseId: FIRESTORE_DATABASE_ID, error: 'firestore_project_id_missing' };
  try {
    const db = createFirestoreRestDb({ projectId: FIRESTORE_PROJECT_ID, databaseId: FIRESTORE_DATABASE_ID });
    const snapshot = await db.collection('_neo_system').doc('connectivity').get();
    return {
      connected: true,
      provider: 'firestore',
      projectConfigured: true,
      databaseId: FIRESTORE_DATABASE_ID,
      sentinelExists: snapshot.exists,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      provider: 'firestore',
      projectConfigured: true,
      databaseId: FIRESTORE_DATABASE_ID,
      error: String(error?.message || error),
      checkedAt: new Date().toISOString()
    };
  }
}

function systemManifest() {
  return {
    system: 'NEO System',
    mode: 'live-production',
    edge: 'neo-edge',
    services: Object.keys(SERVICES).map(serviceSnapshot),
    publicSearch: '/noogle/search?q=',
    treasuryWallet: TREASURY_WALLET,
    assets: { NOMNI, scan: SCAN_CONFIG },
    ces: CES_CONFIG,
    policy: {
      publicLibraryOnly: true,
      protectedResourcesRemainServerSide: true,
      runtimeSecretsInBrowser: false,
      privateKeysNeverPublished: true,
      cesMutationsRequireAuthenticatedBackend: true
    }
  };
}

export function createNeoEdgeServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      cors(req, res);
      res.writeHead(204);
      return res.end();
    }

    const host = hostOf(req);
    const service = serviceSnapshot(host);
    const url = new URL(req.url || '/', `https://${host || 'neo.holytemples.org'}`);

    if (!service) return json(req, res, 421, { error: 'unknown_neo_host', host });

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(req, res, 200, {
        ok: true,
        observedAt: new Date().toISOString(),
        edge: 'neo-edge',
        service,
        library: libraryHealth()
      });
    }

    if (req.method === 'GET' && url.pathname === '/api') {
      return json(req, res, 200, { service, system: systemManifest() });
    }

    if (req.method === 'GET' && url.pathname === '/services') {
      return json(req, res, 200, systemManifest());
    }

    if (req.method === 'GET' && (url.pathname === '/nomni.json' || url.pathname === '/api/nomni' || url.pathname === '/api/assets/NOMNI')) {
      return json(req, res, 200, { ...NOMNI, valuation: await getNomniValuation() });
    }

    if (req.method === 'GET' && (url.pathname === '/api/nomni/value' || url.pathname === '/value')) {
      return json(req, res, 200, await getNomniValuation());
    }

    if (req.method === 'GET' && (url.pathname === '/api/wallet' || url.pathname === '/wallet')) {
      return json(req, res, 200, { wallet: TREASURY_WALLET, network: ['bitcoin','counterparty'], role: 'treasury-settlement', privateKeyExposed: false });
    }

    if (req.method === 'GET' && (url.pathname === '/api/treasury' || url.pathname === '/treasury')) {
      return json(req, res, 200, TREASURY);
    }

    if (req.method === 'GET' && (url.pathname === '/api/scan/config' || url.pathname === '/scan/config')) {
      return json(req, res, 200, SCAN_CONFIG);
    }

    if (req.method === 'GET' && (url.pathname === '/api/ces' || url.pathname === '/ces')) {
      return json(req, res, 200, { ...CES_CONFIG, databaseHealth: '/api/database/health', mutationStatus: 'authentication-required' });
    }

    if (req.method === 'GET' && (url.pathname === '/api/database/health' || url.pathname === '/database/health')) {
      const db = await databaseHealth();
      return json(req, res, db.connected ? 200 : 503, db);
    }

    if (req.method === 'GET' && (url.pathname === '/library' || url.pathname === '/api/library')) {
      return json(req, res, 200, { records: libraryCatalog(), accessClass: 'PUBLIC_WORLD_LIBRARY' });
    }

    if (req.method === 'GET' && (url.pathname === '/noogle/search' || url.pathname === '/api/noogle/search')) {
      const q = String(url.searchParams.get('q') || '').trim();
      if (!q) return json(req, res, 400, { error: 'query_required', parameter: 'q' });
      const records = searchPublicLibrary(q);
      return json(req, res, 200, {
        query: q,
        records,
        count: records.length,
        engine: 'Noogle public library search',
        accessClass: 'PUBLIC_WORLD_LIBRARY'
      });
    }

    if (req.method === 'GET' && url.pathname === '/') {
      const hostSpecific = host === 'nomni.holytemples.org' ? { asset: { ...NOMNI, valuation: await getNomniValuation() } }
        : host === 'wallet.holytemples.org' ? { treasuryWallet: TREASURY_WALLET }
        : host === 'treasury.holytemples.org' ? { treasury: TREASURY }
        : host === 'scan.holytemples.org' ? { scan: SCAN_CONFIG }
        : host === 'neobank.holytemples.org' ? { ces: CES_CONFIG }
        : {};
      return json(req, res, 200, {
        service,
        system: 'NEO System',
        status: 'online',
        ...hostSpecific,
        endpoints: ['/health', '/api', '/services', '/nomni.json', '/api/nomni/value', '/api/wallet', '/api/treasury', '/api/scan/config', '/api/ces', '/api/database/health', '/library', '/noogle/search?q=']
      });
    }

    return json(req, res, 404, { error: 'not_found', service: service.id, path: url.pathname });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createNeoEdgeServer().listen(PORT, '0.0.0.0', () => {
    console.log(`NEO edge listening on 0.0.0.0:${PORT}`);
  });
}
