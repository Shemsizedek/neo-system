const DEFAULT_BASE_URL = 'https://www.community-exchange.org';

export function createCesSessionAdapter({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  credentialProvider,
  csrfParser = defaultCsrfParser,
  cookieJar = createMemoryCookieJar(),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
  if (typeof credentialProvider !== 'function') throw new Error('credentialProvider is required');

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

    // Stage 1 deliberately supports configurable form metadata because CES installations
    // can expose different coordinator/member login forms. No credential is stored here.
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

  return {
    login,
    reviewTransaction(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({
        ok: true,
        mode: 'session-ready',
        operation: 'reviewTransaction',
        exchange,
        message: 'Authenticated CES session established. Transaction scraping/selector mapping is the next adapter layer.',
      }));
    },
    approveTransaction(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({
        ok: false,
        mode: 'guarded',
        operation: 'approveTransaction',
        exchange,
        message: 'Approval endpoint/form mapping is not configured; no CES write action was taken.',
      }));
    },
    issueVDollars(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({
        ok: false,
        mode: 'guarded',
        operation: 'issueVDollars',
        exchange,
        message: 'V-Dollar issuance form mapping is not configured; no CES value movement was performed.',
      }));
    },
    uploadPublication(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({ ok: false, mode: 'guarded', operation: 'uploadPublication', exchange }));
    },
    maintainSubscription(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({ ok: false, mode: 'guarded', operation: 'maintainSubscription', exchange }));
    },
    reviewVirtualTrader(payload) {
      return withSession(payload.exchange, async ({ exchange, request }) => {
        const response = await request('/win/virtual.asp');
        const text = await response.text();
        return {
          ok: response.ok,
          mode: 'read-only',
          operation: 'reviewVirtualTrader',
          exchange,
          status: response.status,
          pageDetected: /Virtual Trader/i.test(text),
        };
      });
    },
    reviewInterexchangeSettlement(payload) {
      return withSession(payload.exchange, async ({ exchange }) => ({
        ok: true,
        mode: 'read-only',
        operation: 'reviewInterexchangeSettlement',
        exchange,
        message: 'Session established; settlement table parser is pending selector capture.',
      }));
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
