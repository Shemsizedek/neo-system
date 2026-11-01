import { inventoryCesForms, classifyCesForm } from './ces-form-mapper.mjs';
import { createLegacyCesCrawler } from './ces-legacy-crawler.mjs';
import { createMemoryCesManifestStore } from './ces-manifest-store.mjs';
import { generateLegacyRouteCandidates } from './ces-legacy-route-candidates.mjs';
import { readNmniAdminReport } from './nmni-admin-reader.mjs';

const DEFAULT_BASE_URL = 'https://www.community-exchange.org';

export function createCesSessionAdapter({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  credentialProvider,
  csrfParser = defaultCsrfParser,
  cookieJar = createMemoryCookieJar(),
  manifestStore = createMemoryCesManifestStore(),
  sessionValidator = defaultSessionValidator,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
  if (typeof credentialProvider !== 'function') throw new Error('credentialProvider is required');
  if (typeof sessionValidator !== 'function') throw new Error('sessionValidator is required');
  if (!manifestStore?.save || !manifestStore?.get) throw new Error('manifestStore with save/get is required');

  const trustedOrigin = new URL(baseUrl).origin;
  if (new URL(baseUrl).protocol !== 'https:' || new URL(baseUrl).username || new URL(baseUrl).password) {
    throw new Error('CES base URL must be HTTPS without embedded credentials');
  }

  function resolveTrustedUrl(path) {
    const url = new URL(path, baseUrl);
    if (url.origin !== trustedOrigin) throw new Error(`CES cross-origin request blocked: ${url.origin}`);
    if (url.username || url.password) throw new Error('CES URL credentials are not permitted');
    return url;
  }

  async function request(path, options = {}) {
    const url = resolveTrustedUrl(path);
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
    const loginUrl = resolveTrustedUrl(credentials.loginPath || '/');
    const submitUrl = resolveTrustedUrl(credentials.submitPath || credentials.loginPath || '/');
    if (sessionValidator === defaultSessionValidator) {
      if (!credentials.authenticatedPath || !credentials.authenticatedText) throw new Error('CES protected-page verification is not configured');
      resolveTrustedUrl(credentials.authenticatedPath);
      if (credentials.successLocationPattern) new RegExp(credentials.successLocationPattern);
    }

    const loginPage = await request(credentials.loginPath || '/');
    const html = await loginPage.text();
    validateCesLoginContract(html, {
      pageUrl: loginPage.url || loginUrl.toString(),
      submitUrl: submitUrl.toString(),
      usernameField: credentials.usernameField || 'username',
      passwordField: credentials.passwordField || 'password',
    });
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
    const validation = await sessionValidator({ response, exchange, credentials, request, baseUrl });
    if (!validation?.authenticated) {
      const error = new Error('CES login response did not validate an authenticated session');
      error.validationReason = validation?.reason;
      throw error;
    }

    return {
      ok: true,
      exchangeId: exchange.exchangeId,
      adminAccount: exchange.adminAccount,
      bankAccount: exchange.bankAccount,
      authenticated: true,
      status: response.status,
      validation: validation.reason || 'validated',
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
      const pageUrl = resolveTrustedUrl(path).toString();
      const forms = inventoryCesForms(html, { pageUrl }).map((form) => ({ ...form, classification: classifyCesForm(form) }));
      return { ok: response.ok, mode: 'discovery-read-only', path, status: response.status, forms };
    });
  }

  async function discoverLegacyControlPanel(exchange, options = {}) {
    return withSession(exchange, async ({ request: sessionRequest }) => {
      const crawler = createLegacyCesCrawler({ request: sessionRequest, baseUrl, surfaces: options.surfaces, maxLinksPerPage: options.maxLinksPerPage });
      const manifest = await crawler.crawl(exchange);
      const routeCandidates = generateLegacyRouteCandidates(manifest, { minScore: options.minCandidateScore || 25 });
      const enrichedManifest = { ...manifest, routeCandidates, candidatePolicy: { autoPromotion: false, requiresHumanReview: true, trustedByDefault: false } };
      const stored = await manifestStore.save(enrichedManifest);
      return { ok: true, mode: 'legacy-discovery-read-only', persisted: true, manifest: stored, routeCandidates };
    });
  }

  async function getLegacyDiscoveryManifest(exchangeId) { return manifestStore.get(exchangeId, 'legacy'); }

  return {
    login, discoverForms, discoverLegacyControlPanel, getLegacyDiscoveryManifest,
    readNmniTradingStatistics({ exchange, collect = true }) {
      return withSession(exchange, ({ request }) => readNmniAdminReport({ request, exchange, collect }));
    },
    reviewTransaction(payload) {
      const path = payload.path || payload.discoveryPath;
      if (path) return discoverForms(payload.exchange, path);
      return withSession(payload.exchange, async ({ exchange }) => ({ ok: true, mode: 'session-ready', operation: 'reviewTransaction', exchange, message: 'Authenticated CES session established. Supply a discovery path to inventory transaction forms without submitting them.' }));
    },
    approveTransaction(payload) { return withSession(payload.exchange, async ({ exchange }) => ({ ok: false, mode: 'guarded', operation: 'approveTransaction', exchange, message: 'Approval remains disabled until an exact CES form fingerprint is reviewed and allowlisted.' })); },
    issueVDollars(payload) { return withSession(payload.exchange, async ({ exchange }) => ({ ok: false, mode: 'guarded', operation: 'issueVDollars', exchange, message: 'V-Dollar issuance remains disabled until an exact CES form fingerprint is reviewed and allowlisted.' })); },
    uploadPublication(payload) { return withSession(payload.exchange, async ({ exchange }) => ({ ok: false, mode: 'guarded', operation: 'uploadPublication', exchange, message: 'Publication writes remain disabled until the target form is discovered and allowlisted.' })); },
    maintainSubscription(payload) { return withSession(payload.exchange, async ({ exchange }) => ({ ok: false, mode: 'guarded', operation: 'maintainSubscription', exchange, message: 'Subscription writes remain disabled until the target form is discovered and allowlisted.' })); },
    reviewVirtualTrader(payload) {
      return withSession(payload.exchange, async ({ exchange, request: sessionRequest }) => {
        const response = await sessionRequest('/win/virtual.asp');
        const text = await response.text();
        return { ok: response.ok, mode: 'read-only', operation: 'reviewVirtualTrader', exchange, status: response.status, pageDetected: /Virtual Trader/i.test(text), forms: inventoryCesForms(text, { pageUrl: resolveTrustedUrl('/win/virtual.asp').toString() }).map((form) => ({ ...form, classification: classifyCesForm(form) })) };
      });
    },
    reviewInterexchangeSettlement(payload) { return discoverForms(payload.exchange, payload.path || '/win/virtual.asp'); },
  };
}

export function validateCesLoginContract(html, { pageUrl, submitUrl, usernameField, passwordField } = {}) {
  if (!pageUrl || !submitUrl) throw new Error('CES login contract validation requires pageUrl and submitUrl');
  if (!usernameField || !passwordField) throw new Error('CES login contract validation requires configured credential field names');

  const forms = inventoryCesForms(html, { pageUrl });
  const expectedSubmit = new URL(submitUrl, pageUrl).toString();
  const form = forms.find((candidate) => {
    if (String(candidate.method || 'GET').toUpperCase() !== 'POST') return false;
    const action = new URL(candidate.action || pageUrl, pageUrl).toString();
    if (action !== expectedSubmit) return false;
    const names = new Set((candidate.fields || []).map((field) => field.name).filter(Boolean));
    return names.has(usernameField) && names.has(passwordField);
  });

  if (!form) {
    throw new Error('CES login contract mismatch: configured POST action or credential field names were not found on the login page');
  }

  return {
    ok: true,
    action: expectedSubmit,
    method: 'POST',
    usernameField,
    passwordField,
    fingerprint: form.fingerprint,
  };
}

export function createMemoryCookieJar() {
  const stores = new Map();
  return {
    getCookieHeader(url) {
      const jar = stores.get(url.origin);
      return jar ? [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ') : '';
    },
    storeFromResponse(url, response) {
      const values = typeof response.headers?.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : splitSetCookieHeader(response.headers?.get?.('set-cookie'));
      if (!values?.length) return;
      const jar = stores.get(url.origin) || new Map();
      for (const raw of values) {
        const pair = String(raw).split(';', 1)[0];
        const separator = pair.indexOf('=');
        if (separator <= 0) continue;
        const name = pair.slice(0, separator).trim();
        const value = pair.slice(separator + 1).trim();
        if (!value) jar.delete(name); else jar.set(name, value);
      }
      stores.set(url.origin, jar);
    },
  };
}

export async function defaultSessionValidator({ response, credentials, request, baseUrl }) {
  const reject = (reason) => ({ authenticated: false, reason });
  if (!credentials.authenticatedPath || !credentials.authenticatedText || typeof request !== 'function') {
    return reject('protected-page-verification-required');
  }
  const origin = new URL(baseUrl).origin;
  const probeUrl = new URL(credentials.authenticatedPath, baseUrl);
  if (probeUrl.origin !== origin || probeUrl.username || probeUrl.password) return reject('untrusted-protected-page');
  if (response.status < 200 || response.status >= 400) return reject('login-response-rejected');
  const location = response.headers?.get?.('location') || '';
  if (response.status >= 300 && !location) return reject('missing-login-redirect');
  if (location) {
    const target = new URL(location, baseUrl);
    if (target.origin !== origin || target.username || target.password) return reject('untrusted-login-redirect');
    if (credentials.successLocationPattern) {
      const pattern = new RegExp(credentials.successLocationPattern instanceof RegExp ? credentials.successLocationPattern.source : String(credentials.successLocationPattern), 'i');
      if (!pattern.test(target.pathname + target.search)) return reject('login-redirect-mismatch');
    }
  }
  const probe = await request(probeUrl.toString(), { method: 'GET' });
  if (probe.status < 200 || probe.status >= 300 || probe.headers?.get?.('location')) return reject('protected-page-unavailable');
  if (probe.url && new URL(probe.url).origin !== origin) return reject('untrusted-protected-response');
  const html = await probe.text();
  const forms = inventoryCesForms(html, { pageUrl: probeUrl.toString() });
  if (forms.some((form) => form.fields.some((field) => field.type === 'password'))) return reject('login-form-returned');
  if (!html.includes(String(credentials.authenticatedText))) return reject('protected-page-marker-missing');
  return { authenticated: true, reason: 'protected-page-marker-verified' };
}

function splitSetCookieHeader(value) {
  if (!value) return [];
  return String(value).split(/,(?=\s*[^;,=\s]+=[^;,]+)/g).map((item) => item.trim()).filter(Boolean);
}

export function defaultCsrfParser(html, credentials = {}) {
  const inputs = [...String(html).matchAll(/<input\b([^>]*)>/gi)];
  for (const input of inputs) {
    const attrs = parseHtmlAttributes(input[1]);
    const name = attrs.name || '';
    if (!name) continue;
    if (credentials.csrfField && name === credentials.csrfField && attrs.value !== undefined) return { name, value: attrs.value };
    if (!credentials.csrfField && /csrf|token/i.test(name) && attrs.value !== undefined) return { name, value: attrs.value };
  }
  return null;
}

function parseHtmlAttributes(source = '') {
  const attrs = {};
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return attrs;
}

