import http from 'node:http';
import { URL } from 'node:url';
import { searchPublicLibrary, libraryCatalog, libraryAsset, health as libraryHealth } from '../holytemples-adapter/adapter.mjs';
import { createFirestoreRestDb } from '../neo-counter-backend/firestore-rest-db.mjs';
import { readFile } from 'node:fs/promises';
import { renderWorldLeaders } from './leaders-app.mjs';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 8080);
const TREASURY_WALLET = '18FyntJG9hdXYvanm67mGgbyo1P7adckvg';
const FIRESTORE_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || '(default)';
const TOKENSCAN_NOMNI_URL = 'https://tokenscan.io/api/asset/NOMNI';
const HOLY_KEYS_FAVICON_URL = 'https://holytemples.org/wp-content/uploads/2026/09/holy-keys-transparent-master.png';
const NOMNI_FALLBACK_VALUE = Object.freeze({ usd: '20.72', xcp: '13.03076220', btc: null });
const BRIDGE_ASSET_PATH = fileURLToPath(new URL('./assets/neo-bridge.js', import.meta.url));
const SUITE_ASSET_PATH = fileURLToPath(new URL('./assets/neo-suite.js', import.meta.url));
const AI_ASSET_PATH = fileURLToPath(new URL('./assets/neo-ai.js', import.meta.url));
const NEOPASS_RUNTIME_PATH = fileURLToPath(new URL('./assets/neopass-runtime.js', import.meta.url));
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
  'treasury.holytemples.org': { id: 'world-treasury', name: 'World Treasury', role: 'treasury', api: true },
  'nvsn.holytemples.org': { id: 'nvsn', name: 'NEO Virtual Satellite Network', role: 'communications-fabric', api: true },
  'leaders.holytemples.org': { id: 'world-leaders-forum', name: 'World Leaders Forum — World HQ', role: 'public-site', api: false }
});


const SEO = Object.freeze({
  'neo-system': ['NEO System — Digital Infrastructure for the Global Village','Explore the NEO System: integrated digital infrastructure for governance, finance, education, media, commerce, identity, research and community operations.'],
  'neo-router': ['NEO Router — Unified Access Across the NEO Ecosystem','Route securely across NEO services, public interfaces and connected digital infrastructure from one unified NEO gateway.'],
  'neo-algo': ['NEO Algo — Noological Intelligence & Decision Systems','NEO Algo brings structured reasoning, research, analysis and decision-support workflows into the wider NEO System.'],
  'neo-prime': ['NEO Prime — NEO System Orchestration','NEO Prime coordinates core services, automation and operational orchestration across the NEO digital ecosystem.'],
  'neopay': ['NEOpay — Bitcoin & Counterparty Wallet Infrastructure','NEOpay provides the NEO ecosystem entry point for Bitcoin, Counterparty and digital asset wallet services.'],
  'neo-bank': ['NEO Bank — Community Exchange & Digital Finance','NEO Bank connects community exchange, ledger and digital-finance services across the NEO ecosystem.'],
  'neo-hub': ['NEO Hub — Your Gateway to the NEO Ecosystem','Discover NEO services, tools, dashboards and public infrastructure from one central digital hub.'],
  'neo-counter': ['NEO Counter — Commerce, Checkout & Merchant Infrastructure','NEO Counter powers commerce, checkout, merchant tools and transaction workflows across the NEO ecosystem.'],
  'neo-wire': ['NEO Wire — Digital Settlement & Transfer Infrastructure','NEO Wire supports transfer, settlement and connected financial workflows across the NEO ecosystem.'],
  'neogram': ['NEOgram — Communications for the NEO Ecosystem','NEOgram is the communications layer for connected communities, projects and services across the NEO ecosystem.'],
  'neofx': ['NEOfx — Digital Asset Market & Exchange Tools','Explore NEO digital-asset exchange, market and settlement tools across the Bitcoin and Counterparty ecosystem.'],
  'neoscan': ['NEO Scan — Bitcoin & Counterparty Explorer','Explore NEO ecosystem assets, public network data and Counterparty-aware blockchain information.'],
  'gisd': ['Global Interdependent School System — GISS','Explore the Global Interdependent School System, NEO LMS and the education pathway connecting foundational learning with Nu University.'],
  'neo-library': ['NEO Library — World Knowledge & Research Archive','Search public knowledge, research, educational resources and institutional records across the NEO ecosystem.'],
  'neo-books': ['NEO Books — Accounting, Treasury & Ledger Platform','NEO Books provides accounting, treasury, ledger and reporting infrastructure for the NEO ecosystem.'],
  'neo-pads': ['NEO Pads — Hospitality & Lodging Infrastructure','NEO Pads supports hospitality, lodging and property workflows across the NEO ecosystem.'],
  'neopass': ['NEO Pass — Identity & Access Infrastructure','NEO Pass provides identity, access and authentication infrastructure across the NEO ecosystem.'],
  'neo-tv': ['NEO Vision — Media, Broadcasting & Digital Culture','NEO Vision brings media, broadcasting, educational programming and digital culture into the NEO ecosystem.'],
  'noogle': ['Noogle — Search the NEO Knowledge Ecosystem','Search public NEO knowledge, services, research, archives and digital resources from one discovery engine.'],
  'omnitrix': ['Omnitrix — NEO Browser & Discovery Layer','Browse and discover NEO services and connected digital resources through the Omnitrix interface.'],
  'neo-dash': ['NEO Dash — Unified NEO System Dashboard','Monitor and access NEO platforms, services and operational surfaces from a unified dashboard.'],
  'nomni': ['NOMNI — Digital World Currency on Counterparty','Explore NOMNI, the NEO ecosystem digital world-currency asset issued on Counterparty and settled on Bitcoin.'],
  'neo-treasury-wallet': ['NEO Treasury Wallet — Digital Asset Treasury Access','Access the public treasury wallet surface for Bitcoin, Counterparty and NEO ecosystem digital assets.'],
  'world-treasury': ['World Treasury — NEO Ecosystem Treasury Infrastructure','Explore the World Treasury infrastructure supporting digital assets, settlement and treasury operations across the NEO ecosystem.'],
  'nvsn': ['NVSN — NEO Virtual Satellite Network','Explore the NEO Virtual Satellite Network, a communications-fabric project within the wider NEO ecosystem.'],
  'world-leaders-forum': ['World Leaders Forum — International Cooperation & Global Peace','The World Leaders Forum connects leaders and communities around diplomacy, peacebuilding, human rights and international cooperation.']
});

function seoFor(service, host) {
  const pair = SEO[service.id] || [service.name + ' — NEO System', service.name + ' is part of the NEO digital ecosystem serving the Global Village.'];
  return {
    title: pair[0],
    description: pair[1],
    canonical: 'https://' + host + '/',
    image: HOLY_KEYS_FAVICON_URL
  };
}

function seoLanding(service, host) {
  const seo = seoFor(service, host);
  const data = JSON.stringify({
    '@context':'https://schema.org',
    '@type':'WebSite',
    name:service.name,
    url:seo.canonical,
    description:seo.description,
    isPartOf:{'@type':'WebSite',name:'World Temple / NEO System',url:'https://holytemples.org/'}
  }).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${seo.title}</title><meta name="description" content="${seo.description}"><link rel="canonical" href="${seo.canonical}"><link rel="icon" type="image/png" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta property="og:type" content="website"><meta property="og:site_name" content="NEO System"><meta property="og:title" content="${seo.title}"><meta property="og:description" content="${seo.description}"><meta property="og:url" content="${seo.canonical}"><meta property="og:image" content="${seo.image}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${seo.title}"><meta name="twitter:description" content="${seo.description}"><meta name="twitter:image" content="${seo.image}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><script type="application/ld+json">${data}</script><style>body{margin:0;background:#080a0d;color:#f5f1e8;font-family:Inter,system-ui,sans-serif}main{max-width:900px;margin:auto;padding:72px 24px}.eyebrow{letter-spacing:.16em;text-transform:uppercase;color:#c9a55b;font-weight:800;font-size:.78rem}h1{font-size:clamp(2.8rem,8vw,6rem);line-height:.95;margin:.4rem 0 1rem}p{font-size:1.1rem;line-height:1.7;color:#c9c4bb;max-width:760px}.cta{display:inline-block;margin-top:18px;padding:12px 16px;border-radius:999px;background:#c9a55b;color:#111;text-decoration:none;font-weight:800}</style></head><body><main><div class="eyebrow">NEO SYSTEM · HOLYTEMPLES.ORG</div><h1>${service.name}</h1><p>${seo.description}</p><a class="cta" href="/api">Open Public API</a></main></body></html>`;
}

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

function htmlPage(res, status, body) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://egov.holytemples.org; img-src 'self' data: https:"
  });
  res.end(body);
}

function json(req, res, status, body) {
  cors(req, res);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=30' : 'no-store'
  });
  res.end(JSON.stringify(body));
}

async function javascript(req, res, path) {
  try {
    const body = await readFile(path, 'utf8');
    cors(req, res);
    res.writeHead(200, {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
      'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'cross-origin'
    });
    res.end(body);
  } catch {
    json(req, res, 404, { error: 'asset_not_found' });
  }
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

    if (req.method === 'GET' && ['/favicon.ico','/favicon.png','/apple-touch-icon.png'].includes(url.pathname)) {
      res.writeHead(302, {
        location: HOLY_KEYS_FAVICON_URL,
        'cache-control': 'public, max-age=3600',
        'x-content-type-options': 'nosniff'
      });
      return res.end();
    }


    if (req.method === 'GET' && url.pathname === '/robots.txt') {
      res.writeHead(200, {'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=3600'});
      return res.end(`User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml\n`);
    }

    if (req.method === 'GET' && url.pathname === '/sitemap.xml') {
      const lastmod = new Date().toISOString();
      const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${host}/</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url><url><loc>https://${host}/api</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url></urlset>`;
      res.writeHead(200, {'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'});
      return res.end(xml);
    }

    if (host === 'leaders.holytemples.org' && req.method === 'GET') {
      return renderWorldLeaders(res, url.pathname);
    }


    if (req.method === 'GET' && url.pathname === '/assets/neo-bridge.js') {
      return javascript(req, res, BRIDGE_ASSET_PATH);
    }

    if (req.method === 'GET' && url.pathname === '/assets/neo-suite.js') {
      return javascript(req, res, SUITE_ASSET_PATH);
    }

    if (req.method === 'GET' && url.pathname === '/assets/neo-ai.js') {
      return javascript(req, res, AI_ASSET_PATH);
    }

    if (req.method === 'GET' && url.pathname === '/assets/neopass-runtime.js') {
      return javascript(req, res, NEOPASS_RUNTIME_PATH);
    }

    if (host === 'neo.holytemples.org' && req.method === 'GET' && url.pathname === '/neosync') {
      res.writeHead(308, { location: '/neosync/', 'cache-control': 'no-store' });
      return res.end();
    }

    if (host === 'neo.holytemples.org' && req.method === 'GET' && url.pathname === '/neosync/') {
      return htmlPage(res, 200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#020704"><link rel="icon" type="image/png" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><title>NEOsync Conversation Workspace</title><style>html,body{margin:0;min-height:100%;background:#020704}body{padding:16px}neo-temple-ai{display:block;max-width:1500px;margin:auto}</style><script src="/assets/neopass-runtime.js" defer></script><script src="/assets/neo-ai.js" defer></script></head><body><neo-temple-ai capability="personalization" fullscreen></neo-temple-ai></body></html>`);
    }

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

    const libraryRecordMatch = url.pathname.match(/^\/api\/library\/([^/]+)$/);
    if (req.method === 'GET' && libraryRecordMatch) {
      const record = libraryAsset(decodeURIComponent(libraryRecordMatch[1]));
      if (!record) return json(req, res, 404, { error: 'library_record_not_found' });
      return json(req, res, 200, { record, accessClass: 'PUBLIC_WORLD_LIBRARY', oracleClass: 'internal-record-context' });
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
      const accept = String(req.headers.accept || '');
      if (accept.includes('text/html')) return htmlPage(res, 200, seoLanding(service, host));
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
