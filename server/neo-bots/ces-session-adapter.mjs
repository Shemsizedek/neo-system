import { inventoryCesForms, classifyCesForm } from './ces-form-mapper.mjs';
import { createLegacyCesCrawler } from './ces-legacy-crawler.mjs';
import { createMemoryCesManifestStore } from './ces-manifest-store.mjs';

const DEFAULT_BASE_URL = 'https://www.community-exchange.org';

export function createCesSessionAdapter({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  credentialProvider,
  csrfParser = defaultCsrfParser,
  cookieJar = createMemoryCookieJar(),
  manifestStore = createMemoryCesManifestStore(),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
  if (typeof credentialProvider !== 'function') throw new Error('credentialProvider is required');
  if (!manifestStore?.save || !manifestStore?.get) throw new Error('manifestStore with save/get is required');

  async function request(path, options = {}) {
    const url = new URL(path, baseUrl);
    const headers = new Headers(options.headers || {});
    const cookie = cookieJar.getCookieHeader(url);
    if (cookie) headers.set('cookie', cookie);

    const response = await fetchImpl(url, { ...options, headers, redirect: 'manual' });
    cookieJar.storeFromResponse(url, response);
    return response;
  }

  async function login(exchange) {
    const credentials = await credentialProvider(exchange);
    if (!credentials?.username || !credentials?.password) {
      throw new Error(`missing CES credentials for ${exchange.exchangeId}`);
    }

    const loginPage = await request(credentials.loginPath || '/');
    const html = await loginPage.text();
    const csrf = csrfParser(html, credentials);

    const body = new URLSearchParams();
    body.set(credentials.usernameField || 'username', credentials.username);
    body.set(credentials.passwordField || 'password', credentials.password);
    if (csrf?.name && csrf?.value) body.set(csrf.name, csrf.value);
    for (const [key, value] of Object.entries(credentials.extraFields || {})) body.set(key, value);

    const response = await request(credentials.submitPath || credentials.loginPath || '/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (response.status >= 400) throw new Error(`CES login failed with HTTP ${response.status}`);
    return {
      ok: true,
      exchangeId: exchange.exchangeId,
      adminAccount: exchange.adminAccount,
      bankAccount: exchange.bankAccount,
      authenticated: true,
      status: response.status,
    };
  }

  async function withSession(exchange, operation) {
    await login(exchange);
    return operation({ exchange, request });
  }

  async function discoverForms(exchange, path) {
    return withSession(exchange, async ({ request: sessionRequest }) => {
      const response = await sessionRequest(path);
      const html = await response.text();
      const pageUrl = new URL(path, baseUrl).toString();
      const forms = inventoryCesForms(html, { pageUrl }).map((form) => ({
        ...form,
        classification: classifyCesForm(form),
      }));
      return {
        ok: response.ok,
        mode: 'discovery-read-only',
        path,
        status: response.status,
        forms,
      };
    });
  }

  async function discoverLegacyControlPanel(exchange, options = {}) {
    return withSession(exchange, async ({ request: sessionRequest }) => {
      const crawler = createLegacyCesCrawler({
        request: sessionRequest,
        baseUrl,
        surfaces: options.surfaces,
        maxLinksPerPage: options.maxLinksPerPage,
      });
      const manifest = await crawler.crawl(exchange);
      const stored = await manifestStore.save(manifest);
      return {
        ok: true,
        mode: 'legacy-discovery-read-only',
        persisted: true,
        manifest: stored,
      };
    });
  }

  async function getLegacyDiscoveryManifest(exchangeId) {
    return manifestStore.get(exchangeId, 'legacy');
  }

  return {
    login,
    discoverForms,
    discoverLegacyControlPanel,
    getLegacyDiscoveryManifest,
    reviewTransaction(payload) {
      const path = payload.path || payload.discoveryPath;
      if (path) return discoverForms(payload.exchange, path);
      return withSession(payload.exchange, async ({ exchange }) => ({
        ok: true,
        mode: 'session-ready',
        operation: 'reviewTransaction',
        exchange,
        message: 'Authenticated CES session established. Supply a discovery path to inventory transaction forms without submitting them.',
      }));
    },
    approveTransaction(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({
        ok: false,
        mode: 'guarded',
        operation: 'approveTransaction',
        exchange,
        message: 'Approval remains disabled until an exact CES form fingerprint is reviewed and allowlisted.',
      }));
    },
    issueVDollars(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({
        ok: false,
        mode: 'guarded',
        operation: 'issueVDollars',
        exchange,
        message: 'V-Dollar issuance remains disabled until an exact CES form fingerprint is reviewed and allowlisted.',
      }));
    },
    uploadPublication(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({
        ok: false,
        mode: 'guarded',
        operation: 'uploadPublication',
        exchange,
        message: 'Publication writes remain disabled until the target form is discovered and allowlisted.',
      }));
    },
    maintainSubscription(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({
        ok: false,
        mode: 'guarded',
        operation: 'maintainSubscription',
        exchange,
        message: 'Subscription writes remain disabled until the target form is discovered and allowlisted.',
      }));
    },
    reviewVirtualTrader(payload) {
      return withSession(payload.exchange, async ({ exchange, request: sessionRequest }) => {
        const response = await sessionRequest('/win/virtual.asp');
        const text = await response.text();
        return {
          ok: response.ok,
          mode: 'read-only',
          operation: 'reviewVirtualTrader',
          exchange,
          status: response.status,
          pageDetected: /Virtual Trader/i.test(text),
          forms: inventoryCesForms(text, { pageUrl: new URL('/win/virtual.asp', baseUrl).toString() })
            .map((form) => ({ ...form, classification: classifyCesForm(form) })),
        };
      });
    },
    reviewInterexchangeSettlement(payload) {
      const path = payload.path || '/win/virtual.asp';
      return discoverForms(payload.exchange, path);
    },
  };
}

export function createMemoryCookieJar() {
  const cookies = new Map();
  return {
    getCookieHeader(url) {
      return cookies.get(url.origin) || '';
    },
    storeFromResponse(url, response) {
      const setCookie = response.headers?.get?.('set-cookie');
      if (!setCookie) return;
      const cookie = setCookie.split(';')[0];
      const previous = cookies.get(url.origin);
      cookies.set(url.origin, previous ? `${previous}; ${cookie}` : cookie);
    },
  };
}

export function defaultCsrfParser(html, credentials = {}) {
  const preferred = credentials.csrfField;
  if (preferred) {
    const escaped = preferred.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = html.match(new RegExp(`<input[^>]+name=["']${escaped}["'][^>]+value=["']([^"']+)["']`, 'i'));
    if (match) return { name: preferred, value: match[1] };
  }

  const generic = html.match(/<input[^>]+type=["']hidden["'][^>]+name=["']([^"']*(?:csrf|token)[^"']*)["'][^>]+value=["']([^"']+)["']/i);
  return generic ? { name: generic[1], value: generic[2] } : null;
}
