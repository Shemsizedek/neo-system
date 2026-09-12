(() => {
  'use strict';

  const VERSION = '1.0.0';
  let accessToken = null;
  let expiresAt = 0;
  let member = null;

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

  async function getAccessToken() {
    if (!accessToken) return null;
    if (expiresAt && now() >= expiresAt) {
      clearAccessToken('expired');
      return null;
    }
    return accessToken;
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
    setAccessToken,
    getAccessToken,
    clearAccessToken,
    getSession,
  });
})();
