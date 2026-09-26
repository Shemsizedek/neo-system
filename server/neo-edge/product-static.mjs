import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RELATIONS_ROOT = fileURLToPath(new URL('../../apps/neo-relations/site/', import.meta.url));
const EXCHANGE_ROOT = fileURLToPath(new URL('../../apps/neo-exchange/dist/', import.meta.url));
const FINANCE_FILE = fileURLToPath(new URL('../../apps/noogle/web/finance.html', import.meta.url));
const TELLER_ROOT = fileURLToPath(new URL('../../public/neo-teller/', import.meta.url));
const MINER_ROOT = fileURLToPath(new URL('../../public/neo-miner/', import.meta.url));
const ENTERPRISE_ROOT = fileURLToPath(new URL('../../docs/neo-enterprise/', import.meta.url));
const GUARDIAN_ROOT = fileURLToPath(new URL('../../public/guardian/', import.meta.url));
const PACER_ROOT = fileURLToPath(new URL('../../docs/neo-pacer/', import.meta.url));
const PACER_DATA_ROOT = fileURLToPath(new URL('../../data/neo-pacer/', import.meta.url));
const LINGO_ROOT = fileURLToPath(new URL('../../docs/neo-lingo/', import.meta.url));
const PUBLIC_WORKSPACE_ROOT = fileURLToPath(new URL('../../docs/public-workspace/', import.meta.url));
const CORPUS_ROOT = fileURLToPath(new URL('../../docs/neo-corpus/', import.meta.url));
const REALTY_ROOT = fileURLToPath(new URL('../../apps/neo-realty/web/', import.meta.url));
const REALTY_ORIGIN = String(process.env.NEO_REALTY_ORIGIN || '').replace(/\/$/, '');
const GENERATOR_ROOT = fileURLToPath(new URL('../../public/neo-generator/', import.meta.url));
const GENERATOR_ORIGIN = String(process.env.NEO_GENERATOR_ORIGIN || '').replace(/\/$/, '');
const FOUNDER_IDENTITY_FILE = fileURLToPath(new URL('../../public/api/identity/founder.json', import.meta.url));
const ENTERPRISE_API_ROOT = fileURLToPath(new URL('../../dist/api/enterprise/', import.meta.url));
const PLATFORM_SHELL_CSS = fileURLToPath(new URL('../../public/platform-shell.css', import.meta.url));
const PLATFORM_SHELL_JS = fileURLToPath(new URL('../../public/platform-shell.js', import.meta.url));

const RELATIONS_FILES = Object.freeze({
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/ui': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/data/tenants.json': ['data/tenants.json', 'application/json; charset=utf-8'],
  '/data/status.json': ['data/status.json', 'application/json; charset=utf-8']
});

const CONTENT_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
});

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

async function serveFile(req, res, absolutePath, contentType) {
  try {
    const body = await readFile(absolutePath);
    res.writeHead(200, {
      'content-type': contentType,
      'cache-control': contentType.startsWith('text/html') ? 'no-store' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(body);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    json(res, 500, { error: 'product_asset_unavailable', detail: String(error?.message || error) });
    return true;
  }
}

async function serveText(req, res, absolutePath, transform) {
  try {
    let body = await readFile(absolutePath, 'utf8');
    if (transform) body = transform(body);
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(body);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    json(res, 500, { error: 'product_asset_unavailable', detail: String(error?.message || error) });
    return true;
  }
}

async function serveRelations(req, res, url, host) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-relations' });
    return true;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-relations', mode: 'live-production', host });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'neo-relations', name: 'NEO Relations', role: 'crm', mode: 'live-production', ui: 'https://relations.holytemples.org/' });
    return true;
  }
  const entry = RELATIONS_FILES[url.pathname];
  if (!entry) {
    json(res, 404, { error: 'not_found', service: 'neo-relations', path: url.pathname });
    return true;
  }
  const [relativePath, contentType] = entry;
  const served = await serveFile(req, res, `${RELATIONS_ROOT}${relativePath}`, contentType);
  if (!served) json(res, 500, { error: 'neo_relations_asset_unavailable', path: relativePath });
  return true;
}

async function serveExchange(req, res, url, host) {
  if (url.pathname.startsWith('/api/neo-exchange/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-exchange', mode: 'live-production', host });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'neo-exchange', name: 'NEO Exchange', role: 'markets', mode: 'live-production', marketData: '/api/neo-exchange/markets', ui: 'https://neofx.holytemples.org/' });
    return true;
  }
  const pathname = url.pathname === '/' || url.pathname === '/ui' ? '/index.html' : decodeURIComponent(url.pathname);
  const candidate = resolve(EXCHANGE_ROOT, `.${pathname}`);
  const safeRoot = resolve(EXCHANGE_ROOT) + sep;
  if (!candidate.startsWith(safeRoot) && candidate !== resolve(EXCHANGE_ROOT, 'index.html')) {
    json(res, 400, { error: 'invalid_path', service: 'neo-exchange' });
    return true;
  }
  const contentType = CONTENT_TYPES[extname(candidate).toLowerCase()] || 'application/octet-stream';
  const served = await serveFile(req, res, candidate, contentType);
  if (served) return true;
  if (!extname(pathname)) {
    const fallback = await serveFile(req, res, resolve(EXCHANGE_ROOT, 'index.html'), 'text/html; charset=utf-8');
    if (fallback) return true;
  }
  json(res, 404, { error: 'not_found', service: 'neo-exchange', path: url.pathname });
  return true;
}

async function serveFinance(req, res, url, host) {
  if (url.pathname.startsWith('/api/neo-exchange/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'noogle-finance', mode: 'live-production', marketData: 'neo-exchange', host });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'noogle-finance', name: 'Noogle Finance', role: 'market-intelligence', mode: 'live-production', marketData: '/api/neo-exchange/markets', ui: 'https://finance.holytemples.org/' });
    return true;
  }
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served = await serveFile(req, res, FINANCE_FILE, 'text/html; charset=utf-8');
    if (!served) json(res, 500, { error: 'noogle_finance_ui_unavailable' });
    return true;
  }
  json(res, 404, { error: 'not_found', service: 'noogle-finance', path: url.pathname });
  return true;
}

async function serveTeller(req, res, url, host) {
  if (url.pathname.startsWith('/api/v1/teller/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-teller', mode: 'READ_ONLY', host, network: '/api/v1/teller/network' });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'neo-teller', name: 'NEO Teller', role: 'atm-terminal-platform', mode: 'READ_ONLY', liveData: '/api/v1/teller/network', signing: false, broadcast: false, ui: 'https://teller.holytemples.org/' });
    return true;
  }
  if (url.pathname === '/neo-system/api/platforms/neo-teller.json' || url.pathname === '/api/platforms/neo-teller.json') {
    json(res, 200, { id: 'neo-teller', name: 'NEO Teller', status: 'ready', generatedAt: new Date().toISOString(), endpoint: '/api/v1/teller/network', capabilities: [{ name: 'Bitcoin network telemetry', mode: 'LIVE / READ_ONLY' },{ name: 'Counterparty asset telemetry', mode: 'LIVE / READ_ONLY' },{ name: 'ATM session architecture', mode: 'UI / POLICY GATED' },{ name: 'Signing and broadcast', mode: 'DISABLED' }] });
    return true;
  }
  if (url.pathname === '/platform-shell.css') return serveFile(req, res, PLATFORM_SHELL_CSS, 'text/css; charset=utf-8');
  if (url.pathname === '/platform-shell.js') return serveFile(req, res, PLATFORM_SHELL_JS, 'text/javascript; charset=utf-8');
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served = await serveFile(req, res, resolve(TELLER_ROOT, 'index.html'), 'text/html; charset=utf-8');
    if (!served) json(res, 500, { error: 'neo_teller_ui_unavailable' });
    return true;
  }
  json(res, 404, { error: 'not_found', service: 'neo-teller', path: url.pathname });
  return true;
}

async function serveMiner(req, res, url, host) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-miner' });
    return true;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-miner', mode: 'PUBLIC_READ_ONLY', host });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'neo-miner', name: 'NEO Miner', role: 'bitcoin-mining-control-plane', mode: 'PUBLIC_READ_ONLY', deviceCommands: 'AUTHENTICATED_ONLY', ui: 'https://miner.holytemples.org/' });
    return true;
  }
  if (url.pathname === '/neo-system/api/platforms/neo-miner.json' || url.pathname === '/api/platforms/neo-miner.json') {
    json(res, 200, { id: 'neo-miner', name: 'NEO Miner', status: 'ready', generatedAt: new Date().toISOString(), endpoint: '/api', capabilities: [{ name: 'Mining fleet dashboard', mode: 'UI / LIVE PRODUCTION' },{ name: 'Hashrate and device telemetry', mode: 'READ_ONLY SURFACE' },{ name: 'Mining commerce and contract products', mode: 'UI / POLICY GATED' },{ name: 'Device commands and credentials', mode: 'AUTHENTICATED SERVICES ONLY' }] });
    return true;
  }
  if (url.pathname === '/platform-shell.css' || url.pathname === '/../platform-shell.css') return serveFile(req, res, PLATFORM_SHELL_CSS, 'text/css; charset=utf-8');
  if (url.pathname === '/platform-shell.js' || url.pathname === '/../platform-shell.js') return serveFile(req, res, PLATFORM_SHELL_JS, 'text/javascript; charset=utf-8');
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served = await serveFile(req, res, resolve(MINER_ROOT, 'index.html'), 'text/html; charset=utf-8');
    if (!served) json(res, 500, { error: 'neo_miner_ui_unavailable' });
    return true;
  }
  json(res, 404, { error: 'not_found', service: 'neo-miner', path: url.pathname });
  return true;
}

function enterprisePublicHtml(body, admin = false) {
  const replacements = admin ? [
    ['../../neopay/', 'https://pay.holytemples.org/'],
    ['../../neo-books/', 'https://book.holytemples.org/'],
    ['../../neo-counter/', 'https://counter.holytemples.org/'],
    ['../../neo-teller/', 'https://teller.holytemples.org/'],
    ['../../neo-prime/', 'https://prime.holytemples.org/'],
    ['../../api/enterprise/', '/api/enterprise/']
  ] : [
    ['../neo-hub/', 'https://hub.holytemples.org/'],
    ['../neopay/', 'https://pay.holytemples.org/'],
    ['../neo-books/', 'https://book.holytemples.org/'],
    ['../neo-prime/', 'https://prime.holytemples.org/'],
    ['../neo-teller/', 'https://teller.holytemples.org/'],
    ['../neo-counter/', 'https://counter.holytemples.org/'],
    ['../api/enterprise/', '/api/enterprise/']
  ];
  return replacements.reduce((value, [from, to]) => value.split(from).join(to), body);
}

async function serveEnterprise(req, res, url, host) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-enterprise' });
    return true;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-enterprise', mode: 'PUBLIC_PRODUCTION', host, privateMembershipsExposed: false });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'neo-enterprise', name: 'NEO Enterprise', role: 'business-institutional-suite', mode: 'PUBLIC_PRODUCTION', publicDirectory: '/api/enterprise/organizations.json', privateMembershipsExposed: false, ui: 'https://enterprise.holytemples.org/' });
    return true;
  }
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served = await serveText(req, res, resolve(ENTERPRISE_ROOT, 'index.html'), body => enterprisePublicHtml(body, false));
    if (!served) json(res, 500, { error: 'neo_enterprise_ui_unavailable' });
    return true;
  }
  if (url.pathname === '/admin' || url.pathname === '/admin/' || url.pathname === '/admin/index.html') {
    const served = await serveText(req, res, resolve(ENTERPRISE_ROOT, 'admin/index.html'), body => enterprisePublicHtml(body, true));
    if (!served) json(res, 500, { error: 'neo_enterprise_admin_ui_unavailable' });
    return true;
  }
  if (url.pathname.startsWith('/api/enterprise/')) {
    const name = url.pathname.slice('/api/enterprise/'.length);
    if (!['index.json', 'organizations.json', 'roles.json'].includes(name)) {
      json(res, 404, { error: 'not_found', service: 'neo-enterprise', path: url.pathname });
      return true;
    }
    const served = await serveFile(req, res, resolve(ENTERPRISE_API_ROOT, name), 'application/json; charset=utf-8');
    if (!served) json(res, 500, { error: 'neo_enterprise_public_api_unavailable', asset: name });
    return true;
  }
  json(res, 404, { error: 'not_found', service: 'neo-enterprise', path: url.pathname });
  return true;
}


async function serveGuardian(req, res, url, host) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-guardian' });
    return true;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-guardian', mode: 'DEFENSIVE_PUBLIC_PRODUCTION', host, privilegedDeviceActions: false });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, {
      service: 'neo-guardian',
      name: 'NEO Guardian',
      role: 'mobile-defense-center',
      mode: 'DEFENSIVE_PUBLIC_PRODUCTION',
      version: '/version.json',
      founderIdentity: '/api/identity/founder.json',
      privilegedDeviceActions: 'USER_CONTROLLED_ANDROID_SETTINGS_ONLY',
      ui: 'https://guardian.holytemples.org/'
    });
    return true;
  }
  if (url.pathname === '/api/identity/founder.json') {
    const served = await serveFile(req, res, FOUNDER_IDENTITY_FILE, 'application/json; charset=utf-8');
    if (!served) json(res, 500, { error: 'guardian_identity_unavailable' });
    return true;
  }
  const files = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/ui': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/privacy': ['privacy.html', 'text/html; charset=utf-8'],
    '/privacy.html': ['privacy.html', 'text/html; charset=utf-8'],
    '/terms': ['terms.html', 'text/html; charset=utf-8'],
    '/terms.html': ['terms.html', 'text/html; charset=utf-8'],
    '/version.json': ['version.json', 'application/json; charset=utf-8']
  };
  const entry = files[url.pathname];
  if (!entry) {
    json(res, 404, { error: 'not_found', service: 'neo-guardian', path: url.pathname });
    return true;
  }
  const [relativePath, contentType] = entry;
  const served = await serveFile(req, res, resolve(GUARDIAN_ROOT, relativePath), contentType);
  if (!served) json(res, 500, { error: 'neo_guardian_asset_unavailable', path: relativePath });
  return true;
}


async function servePacer(req, res, url, host, prefix = '') {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-pacer' });
    return true;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-pacer', mode: 'PUBLIC_READ_ONLY', host, sourceOfTruth: 'neo-system/data/neo-pacer' });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, {
      service: 'neo-pacer',
      name: 'NEO-PACER',
      role: 'public-tribunal-records',
      mode: 'PUBLIC_READ_ONLY',
      cases: '/data/neo-pacer/cases.json',
      evidence: '/data/neo-pacer/evidence.json',
      titleChain: '/data/neo-pacer/title-chain.json',
      externalJurisdictionCreated: false,
      ui: prefix ? `https://neo.holytemples.org${prefix}/` : 'https://pacer.holytemples.org/'
    });
    return true;
  }
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served = await serveFile(req, res, resolve(PACER_ROOT, 'index.html'), 'text/html; charset=utf-8');
    if (!served) json(res, 500, { error: 'neo_pacer_ui_unavailable' });
    return true;
  }
  if (url.pathname === '/styles.css') return serveFile(req, res, resolve(PACER_ROOT, 'styles.css'), 'text/css; charset=utf-8');
  if (url.pathname === '/app.js') {
    try {
      let body = await readFile(resolve(PACER_ROOT, 'app.js'), 'utf8');
      body = body.replace(
        "const RAW='https://raw.githubusercontent.com/Shemsizedek/neo-system/main/data/neo-pacer';",
        `const RAW='${prefix}/data/neo-pacer';`
      );
      res.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin'
      });
      if (req.method === 'HEAD') return res.end();
      res.end(body);
      return true;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        json(res, 500, { error: 'neo_pacer_app_unavailable' });
        return true;
      }
      throw error;
    }
  }
  if (url.pathname.startsWith('/data/neo-pacer/')) {
    const name = url.pathname.slice('/data/neo-pacer/'.length);
    if (!/^[a-z0-9-]+\.json$/i.test(name)) {
      json(res, 400, { error: 'invalid_path', service: 'neo-pacer' });
      return true;
    }
    const served = await serveFile(req, res, resolve(PACER_DATA_ROOT, name), 'application/json; charset=utf-8');
    if (!served) json(res, 404, { error: 'not_found', service: 'neo-pacer', path: url.pathname });
    return true;
  }
  json(res, 404, { error: 'not_found', service: 'neo-pacer', path: url.pathname });
  return true;
}


function lingoPublicHtml(body, prefix = '/lingo') {
  return body
    .split('../public-workspace/styles.css').join(`${prefix}/styles.css`)
    .split('../neo-hub/').join('https://hub.holytemples.org/')
    .split('../noogle/?q=').join('https://noogle.holytemples.org/?q=');
}

async function serveLingo(req, res, url, host, prefix = '/lingo') {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-lingo' });
    return true;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-lingo', mode: 'PUBLIC_READ_ONLY', host, terms: 4 });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, {
      service: 'neo-lingo',
      name: 'NEO Lingo',
      role: 'public-language-and-terminology',
      mode: 'PUBLIC_READ_ONLY',
      ui: `https://neo.holytemples.org${prefix}/`,
      fallbackResearch: 'https://noogle.holytemples.org/'
    });
    return true;
  }
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served = await serveText(req, res, resolve(LINGO_ROOT, 'index.html'), body => lingoPublicHtml(body, prefix));
    if (!served) json(res, 500, { error: 'neo_lingo_ui_unavailable' });
    return true;
  }
  if (url.pathname === '/styles.css') {
    const served = await serveFile(req, res, resolve(PUBLIC_WORKSPACE_ROOT, 'styles.css'), 'text/css; charset=utf-8');
    if (!served) json(res, 500, { error: 'neo_lingo_styles_unavailable' });
    return true;
  }
  json(res, 404, { error: 'not_found', service: 'neo-lingo', path: url.pathname });
  return true;
}

function corpusPublicHtml(body, prefix = '/corpus') {
  return body
    .split('../public-workspace/styles.css').join(`${prefix}/styles.css`)
    .split("fetch('./index.json'").join(`fetch('${prefix}/index.json'`);
}

async function serveCorpus(req,res,url,host,prefix='/corpus'){
  if(req.method!=='GET'&&req.method!=='HEAD'){
    json(res,405,{error:'method_not_allowed',service:'neo-corpus'});
    return true;
  }
  if(url.pathname==='/health'){
    json(res,200,{ok:true,service:'neo-corpus',mode:'PUBLIC_READ_ONLY',host,index:`${prefix}/index.json`});
    return true;
  }
  if(url.pathname==='/api'){
    json(res,200,{
      service:'neo-corpus',
      name:'Noocratic Legal Corpus',
      role:'public-research-source-library',
      mode:'PUBLIC_READ_ONLY',
      ui:`https://neo.holytemples.org${prefix}/`,
      index:`${prefix}/index.json`,
      externalLegalEffect:false
    });
    return true;
  }
  if(url.pathname==='/'||url.pathname==='/ui'||url.pathname==='/index.html'){
    const served=await serveText(req,res,resolve(CORPUS_ROOT,'index.html'),body=>corpusPublicHtml(body,prefix));
    if(!served)json(res,500,{error:'neo_corpus_ui_unavailable'});
    return true;
  }
  if(url.pathname==='/styles.css')return serveFile(req,res,resolve(PUBLIC_WORKSPACE_ROOT,'styles.css'),'text/css; charset=utf-8');
  if(url.pathname==='/index.json')return serveFile(req,res,resolve(CORPUS_ROOT,'index.json'),'application/json; charset=utf-8');
  json(res,404,{error:'not_found',service:'neo-corpus',path:url.pathname});
  return true;
}

function generatorPublicHtml(body, prefix = '/generator') {
  return body
    .split('../platform-shell.css').join(`${prefix}/platform-shell.css`)
    .split('../platform-shell.js').join(`${prefix}/platform-shell.js`)
    .split('../api/platforms/neo-generator.json').join(`${prefix}/api`)
    .split('href="../"').join('href="/"');
}

async function proxyGeneratorPublic(req, res, url) {
  if (req.method !== 'GET') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-generator' });
    return true;
  }
  if (!GENERATOR_ORIGIN) {
    json(res, 503, { error: 'neo_generator_origin_unconfigured' });
    return true;
  }
  const routes = new Map([
    ['/api/health','/health'],
    ['/api/ready','/ready'],
    ['/api/products','/products'],
    ['/api/contracts','/contracts'],
    ['/api/capacity','/capacity'],
    ['/api/hashpower-quotes','/hashpower-quotes'],
    ['/api/sources','/sources']
  ]);
  const upstreamPath=routes.get(url.pathname);
  if (!upstreamPath) {
    json(res, 404, { error: 'not_found', service: 'neo-generator', path: url.pathname });
    return true;
  }
  try {
    const response=await fetch(new URL(upstreamPath + url.search, GENERATOR_ORIGIN), {
      method:'GET',
      headers:{accept:'application/json'},
      signal:AbortSignal.timeout(8000)
    });
    const body=await response.text();
    res.writeHead(response.status,{
      'content-type':response.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff'
    });
    res.end(body);
  } catch (error) {
    json(res, 502, { error:'neo_generator_upstream_unavailable', detail:String(error?.message || error) });
  }
  return true;
}

async function serveGenerator(req, res, url, host, prefix = '/generator') {
  if (url.pathname.startsWith('/api/')) return proxyGeneratorPublic(req,res,url);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res,405,{error:'method_not_allowed',service:'neo-generator'});
    return true;
  }
  if (url.pathname === '/health') {
    json(res,200,{ok:true,service:'neo-generator-front-door',mode:'PUBLIC_READ_ONLY',host,upstream:`${prefix}/api/ready`});
    return true;
  }
  if (url.pathname === '/api') {
    json(res,200,{
      status:'ready',
      service:'neo-generator',
      name:'NEO Generator',
      category:'mining-contract-orchestration',
      mode:'PUBLIC_READ_ONLY',
      generatedAt:new Date().toISOString(),
      capabilities:[
        {name:'Generator product catalog',mode:'read-only / no public products published'},
        {name:'Hashpower contract orchestration',mode:'server-backed / activation gated'},
        {name:'Capacity and quote telemetry',mode:'authoritative-input required'},
        {name:'Payment/settlement adapter',mode:'authenticated execution required'}
      ],
      purchasesEnabled:false,
      settlementEnabled:false,
      ui:`https://neo.holytemples.org${prefix}/`
    });
    return true;
  }
  if (url.pathname === '/platform-shell.css') return serveFile(req,res,PLATFORM_SHELL_CSS,'text/css; charset=utf-8');
  if (url.pathname === '/platform-shell.js') {
    try {
      let body=await readFile(PLATFORM_SHELL_JS,'utf8');
      body=body.replace("const apiPath = `/neo-system/api/platforms/${platform}.json`;", `const apiPath = '${prefix}/api';`);
      res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
      if(req.method==='HEAD') return res.end();
      res.end(body);
      return true;
    } catch(error) {
      json(res,500,{error:'neo_generator_shell_unavailable',detail:String(error?.message||error)});
      return true;
    }
  }
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served=await serveText(req,res,resolve(GENERATOR_ROOT,'index.html'),body=>generatorPublicHtml(body,prefix));
    if(!served) json(res,500,{error:'neo_generator_ui_unavailable'});
    return true;
  }
  json(res,404,{error:'not_found',service:'neo-generator',path:url.pathname});
  return true;
}

function realtyPublicHtml(body, prefix = '/realty') {
  return body.replace('<script>const API=', `<script>window.NEO_REALTY_API='${prefix}/api';const API=`);
}

async function proxyRealtyPublic(req, res, url) {
  if (req.method !== 'GET') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-realty' });
    return true;
  }
  if (!REALTY_ORIGIN) {
    json(res, 503, { error: 'neo_realty_origin_unconfigured' });
    return true;
  }
  let upstreamPath = null;
  if (url.pathname === '/api/health') upstreamPath = '/health';
  else if (url.pathname === '/api/ready') upstreamPath = '/ready';
  else if (url.pathname === '/api/properties') upstreamPath = '/properties';
  else {
    const match = url.pathname.match(/^\/api\/properties\/([^/]+)(\/neo-eligibility)?$/);
    if (match) upstreamPath = `/properties/${encodeURIComponent(decodeURIComponent(match[1]))}${match[2] || ''}`;
  }
  if (!upstreamPath) {
    json(res, 404, { error: 'not_found', service: 'neo-realty', path: url.pathname });
    return true;
  }
  try {
    const target = new URL(upstreamPath + url.search, REALTY_ORIGIN);
    const response = await fetch(target, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    const body = await response.text();
    res.writeHead(response.status, {
      'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    });
    res.end(body);
  } catch (error) {
    json(res, 502, { error: 'neo_realty_upstream_unavailable', detail: String(error?.message || error) });
  }
  return true;
}

async function serveRealty(req, res, url, host, prefix = '/realty') {
  if (url.pathname.startsWith('/api/')) return proxyRealtyPublic(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-realty' });
    return true;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-realty-front-door', mode: 'PUBLIC_READ_ONLY', host, upstream: `${prefix}/api/ready` });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, {
      service: 'neo-realty',
      name: 'NEO Realty',
      role: 'verified-real-estate-discovery',
      mode: 'PUBLIC_READ_ONLY',
      ui: `https://neo.holytemples.org${prefix}/`,
      publicApi: `${prefix}/api/properties`,
      propertyTitleEstablishedByToken: false
    });
    return true;
  }
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served = await serveText(req, res, resolve(REALTY_ROOT, 'index.html'), body => realtyPublicHtml(body, prefix));
    if (!served) json(res, 500, { error: 'neo_realty_ui_unavailable' });
    return true;
  }
  json(res, 404, { error: 'not_found', service: 'neo-realty', path: url.pathname });
  return true;
}

export async function serveProductStatic(req, res, url, host) {
  if (host === 'neo.holytemples.org' && url.pathname === '/corpus') {
    res.writeHead(308, { location: '/corpus/', 'cache-control': 'no-store' });
    res.end();
    return true;
  }
  if (host === 'neo.holytemples.org' && url.pathname.startsWith('/corpus/')) {
    const inner = new URL(url.toString());
    inner.pathname = url.pathname.slice('/corpus'.length) || '/';
    return serveCorpus(req, res, inner, host, '/corpus');
  }
  if (host === 'neo.holytemples.org' && url.pathname === '/generator') {
    res.writeHead(308, { location: '/generator/', 'cache-control': 'no-store' });
    res.end();
    return true;
  }
  if (host === 'neo.holytemples.org' && url.pathname.startsWith('/generator/')) {
    const inner = new URL(url.toString());
    inner.pathname = url.pathname.slice('/generator'.length) || '/';
    return serveGenerator(req, res, inner, host, '/generator');
  }
  if (host === 'neo.holytemples.org' && url.pathname === '/realty') {
    res.writeHead(308, { location: '/realty/', 'cache-control': 'no-store' });
    res.end();
    return true;
  }
  if (host === 'neo.holytemples.org' && url.pathname.startsWith('/realty/')) {
    const inner = new URL(url.toString());
    inner.pathname = url.pathname.slice('/realty'.length) || '/';
    return serveRealty(req, res, inner, host, '/realty');
  }
  if (host === 'neo.holytemples.org' && url.pathname === '/lingo') {
    res.writeHead(308, { location: '/lingo/', 'cache-control': 'no-store' });
    res.end();
    return true;
  }
  if (host === 'neo.holytemples.org' && url.pathname.startsWith('/lingo/')) {
    const inner = new URL(url.toString());
    inner.pathname = url.pathname.slice('/lingo'.length) || '/';
    return serveLingo(req, res, inner, host, '/lingo');
  }
  if (host === 'neo.holytemples.org' && url.pathname === '/pacer') {
    res.writeHead(308, { location: '/pacer/', 'cache-control': 'no-store' });
    res.end();
    return true;
  }
  if (host === 'neo.holytemples.org' && url.pathname.startsWith('/pacer/')) {
    const inner = new URL(url.toString());
    inner.pathname = url.pathname.slice('/pacer'.length) || '/';
    return servePacer(req, res, inner, host, '/pacer');
  }
  if (host === 'relations.holytemples.org') return serveRelations(req, res, url, host);
  if (host === 'neofx.holytemples.org') return serveExchange(req, res, url, host);
  if (host === 'finance.holytemples.org') return serveFinance(req, res, url, host);
  if (host === 'teller.holytemples.org') return serveTeller(req, res, url, host);
  if (host === 'miner.holytemples.org') return serveMiner(req, res, url, host);
  if (host === 'enterprise.holytemples.org') return serveEnterprise(req, res, url, host);
  if (host === 'guardian.holytemples.org') return serveGuardian(req, res, url, host);
  if (host === 'pacer.holytemples.org') return servePacer(req, res, url, host);
  return false;
}
