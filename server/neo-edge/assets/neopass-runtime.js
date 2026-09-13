(() => {
  'use strict';

  const VERSION = '1.1.0';
  const DEFAULT_EXCHANGE_ENDPOINT = 'https://egov.holytemples.org/api/v1/auth/browser-token';
  const REFRESH_SKEW_MS = 30_000;
  let accessToken = null;
  let expiresAt = 0;
  let member = null;
  let exchangePromise = null;

  const now = () => Date.now();

  function normalizeExpiry(value) {
    if (!value) return 0;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric > 10_000_000_000 ? numeric : numeric * 1000;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function clearAccessToken(reason = 'cleared') {
    accessToken = null;
    expiresAt = 0;
    member = null;
    window.dispatchEvent(new CustomEvent('neo:neopass-cleared', { detail: { reason } }));
  }

  function setAccessToken(token, options = {}) {
    if (typeof token !== 'string' || !token.trim()) {
      clearAccessToken('invalid-token');
      return false;
    }
    accessToken = token.trim();
    expiresAt = normalizeExpiry(options.expiresAt || options.exp || 0);
    member = options.member && typeof options.member === 'object' ? { ...options.member } : null;
    window.dispatchEvent(new CustomEvent('neo:neopass-ready', { detail: { authenticated: true, expiresAt: expiresAt || null, member } }));
    return true;
  }

  async function refreshAccessToken({ endpoint = DEFAULT_EXCHANGE_ENDPOINT, silent = true } = {}) {
    if (exchangePromise) return exchangePromise;
    exchangePromise = (async () => {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (response.status === 401 || response.status === 403) {
          clearAccessToken('unauthenticated');
          if (!silent) window.dispatchEvent(new CustomEvent('neo:neopass-auth-required'));
          return null;
        }
        if (!response.ok) throw new Error(`NEOpass exchange returned ${response.status}`);
        const payload = await response.json();
        if (!payload?.token) throw new Error('NEOpass exchange did not return a token');
        setAccessToken(payload.token, { expiresAt: payload.expiresAt, member: payload.member });
        return accessToken;
      } catch (error) {
        if (!silent) window.dispatchEvent(new CustomEvent('neo:neopass-exchange-error', { detail: { message: error?.message || 'NEOpass exchange failed' } }));
        return null;
      } finally {
        exchangePromise = null;
      }
    })();
    return exchangePromise;
  }

  async function getAccessToken() {
    if (accessToken && (!expiresAt || now() < expiresAt - REFRESH_SKEW_MS)) return accessToken;
    if (expiresAt && now() >= expiresAt) clearAccessToken('expired');
    return refreshAccessToken({ silent: true });
  }

  function getSession() {
    return Object.freeze({
      authenticated: Boolean(accessToken && (!expiresAt || now() < expiresAt)),
      expiresAt: expiresAt || null,
      member: member ? { ...member } : null,
    });
  }

  window.addEventListener('neo:neopass-authenticated', event => {
    const detail = event?.detail || {};
    setAccessToken(detail.token, { expiresAt: detail.expiresAt || detail.exp, member: detail.member });
  });

  window.addEventListener('neo:neopass-logout', () => clearAccessToken('logout'));
  window.addEventListener('pagehide', () => clearAccessToken('pagehide'));

  window.NeoPass = Object.freeze({
    version: VERSION,
    exchangeEndpoint: DEFAULT_EXCHANGE_ENDPOINT,
    setAccessToken,
    getAccessToken,
    refreshAccessToken,
    clearAccessToken,
    getSession,
  });

  Promise.resolve().then(() => refreshAccessToken({ silent: true }));
})();
