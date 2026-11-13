// Server-side, sandbox-only account discovery. No money-movement methods.
const API_BASE = 'https://app.moderntreasury.com/api';
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const CURSOR = /^[\x21-\x7e]{1,2048}$/;
const READ_ROLE = /^[a-z_]+:read(?::[A-Za-z0-9_-]+)?$/;
const ACCOUNT_ROLE = /^accounts:read(?::[A-Za-z0-9_-]+)?$/;

export class ModernTreasuryError extends Error {
  constructor(code, status = 502) {
    super(code);
    this.name = 'ModernTreasuryError';
    this.code = code;
    this.status = status;
  }
}

const fail = (code, status) => { throw new ModernTreasuryError(code, status); };

export function createModernTreasuryConnector({
  env = process.env,
  fetchImpl = fetch,
  now = () => new Date().toISOString(),
  timeoutMs = 10000
} = {}) {
  const organizationId = String(env.MODERN_TREASURY_ORGANIZATION_ID || '').trim();
  const apiKey = String(env.MODERN_TREASURY_API_KEY || '').trim();
  const environment = String(env.MODERN_TREASURY_ENVIRONMENT || 'sandbox');
  const missing = [
    !organizationId && 'MODERN_TREASURY_ORGANIZATION_ID',
    !apiKey && 'MODERN_TREASURY_API_KEY'
  ].filter(Boolean);
  const validConfig = environment === 'sandbox' &&
    !/[\s:]/.test(organizationId) && !/[\r\n]/.test(apiKey) &&
    Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 30000;
  let lastVerifiedAt = null;
  let lastError = null;

  function status() {
    return {
      provider: 'modern-treasury',
      environment: 'sandbox',
      read_only: true,
      payment_execution_enabled: false,
      configured: !missing.length && validConfig,
      state: !validConfig ? 'configuration_invalid' : missing.length ? 'not_configured' :
        lastError ? 'verification_failed' : lastVerifiedAt ? 'verified' : 'not_verified',
      missing_variables: [...missing],
      last_verified_at: lastVerifiedAt,
      last_error: lastError
    };
  }

  async function request(path, search = new URLSearchParams()) {
    if (missing.length) fail('modern_treasury_credentials_missing', 503);
    if (!validConfig) fail('modern_treasury_configuration_invalid', 503);
    // Private allowlist: never accept an arbitrary upstream URL or HTTP method.
    if (!['/ping', '/api_keys/current', '/internal_accounts'].includes(path)) {
      fail('modern_treasury_operation_not_allowed', 403);
    }
    const url = new URL(`${API_BASE}${path}`);
    url.search = search.toString();
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await fetchImpl(url.toString(), {
        method: 'GET',
        redirect: 'error',
        cache: 'no-store',
        signal,
        headers: {
          authorization: `Basic ${Buffer.from(`${organizationId}:${apiKey}`).toString('base64')}`,
          accept: 'application/json'
        }
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401 || response.status === 403) fail('modern_treasury_authentication_failed');
        if (response.status === 429) fail('modern_treasury_rate_limited', 503);
        fail('modern_treasury_upstream_failed');
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body || []) {
        size += chunk.byteLength;
        if (size > MAX_RESPONSE_BYTES) fail('modern_treasury_response_too_large');
        chunks.push(Buffer.from(chunk));
      }
      let data;
      try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { fail('modern_treasury_invalid_response'); }
      return { data, nextCursor: response.headers.get('x-after-cursor') };
    } catch (error) {
      if (error instanceof ModernTreasuryError) throw error;
      // Never return upstream bodies, URLs, request headers or raw exceptions.
      fail(signal.aborted ? 'modern_treasury_timeout' : 'modern_treasury_unavailable');
    }
  }

  async function verifyConnection() {
    try {
      const { data: key } = await request('/api_keys/current');
      if (!key || key.object !== 'api_key' || key.live_mode !== false) {
        fail('modern_treasury_sandbox_key_required', 409);
      }
      if (key.organization_id !== organizationId || key.decommissioned !== false) {
        fail('modern_treasury_key_identity_invalid', 409);
      }
      if (!Array.isArray(key.roles) || !key.roles.length ||
          key.roles.some(role => typeof role !== 'string' || !READ_ROLE.test(role))) {
        fail('modern_treasury_read_only_key_required', 409);
      }
      if (!key.roles.some(role => ACCOUNT_ROLE.test(role))) {
        fail('modern_treasury_accounts_read_permission_required', 409);
      }
      await request('/ping');
      lastVerifiedAt = now();
      lastError = null;
      return status();
    } catch (error) {
      lastError = error instanceof ModernTreasuryError ? error.code : 'modern_treasury_unavailable';
      if (error instanceof ModernTreasuryError) throw error;
      fail(lastError);
    }
  }

  async function describeKeyPolicy() {
    const { data: key } = await request('/api_keys/current');
    const summarize = permissions => Array.isArray(permissions) ? permissions.map(item => {
      if (!item || typeof item !== 'object') return { type: typeof item };
      const actions = Array.isArray(item.actions) ? item.actions : [];
      const knownActions = ['read', 'view', 'create', 'update', 'edit', 'delete', 'manage', 'write'];
      return {
        fields: Object.keys(item),
        resource: typeof item.resource === 'string' && /^[a-z_]{1,64}$/.test(item.resource) ? item.resource : null,
        actions: actions.filter(value => knownActions.includes(value)),
        unrecognized_actions: actions.filter(value => !knownActions.includes(value)).length
      };
    }) : null;
    return {
      object: key?.object === 'api_key' ? 'api_key' : 'unexpected',
      fields: key && typeof key === 'object' ? Object.keys(key) : [],
      sandbox: key?.live_mode === false,
      decommissioned: key?.decommissioned === true,
      organization_matches: key?.organization_id === organizationId,
      roles: Array.isArray(key?.roles) ? key.roles.map(role => typeof role === 'string' ? {
        type: 'string',
        scope: /^[a-z_]+:(read|view|manage|write)(:[A-Za-z0-9_-]+)?$/.test(role) ? role.split(':').slice(0, 2).join(':') : null
      } : {
        type: role && typeof role === 'object' ? 'object' : typeof role,
        fields: role && typeof role === 'object' ? Object.keys(role) : [],
        permissions: summarize(role?.permissions)
      }) : null,
      permissions: summarize(key?.permissions)
    };
  }

  async function listInternalAccounts({ perPage = 25, afterCursor, currency } = {}) {
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100 ||
        (afterCursor !== undefined && (typeof afterCursor !== 'string' || !CURSOR.test(afterCursor))) ||
        (currency !== undefined && (typeof currency !== 'string' || !/^[A-Z]{3,5}$/.test(currency)))) {
      fail('modern_treasury_invalid_query', 400);
    }
    // Re-check mode and permissions before every account read, including later pages.
    await verifyConnection();
    const search = new URLSearchParams({ per_page: String(perPage) });
    if (afterCursor !== undefined) search.set('after_cursor', afterCursor);
    if (currency !== undefined) search.set('currency', currency);
    try {
      const { data, nextCursor } = await request('/internal_accounts', search);
      if (!Array.isArray(data) || (nextCursor !== null && !CURSOR.test(nextCursor))) {
        fail('modern_treasury_invalid_response');
      }
      const accounts = data.map(account => {
        if (!account || account.object !== 'internal_account' || account.live_mode !== false) {
          fail('modern_treasury_sandbox_account_required', 409);
        }
        if (typeof account.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(account.id) ||
            typeof account.currency !== 'string' || !/^[A-Z]{3,5}$/.test(account.currency)) {
          fail('modern_treasury_invalid_response');
        }
        // Deliberate field projection: omit account/routing numbers, names,
        // addresses, metadata, bank details, and every other upstream field.
        return { id: account.id, currency: account.currency, live_mode: false };
      });
      return {
        provider: 'modern-treasury', environment: 'sandbox', read_only: true,
        payment_execution_enabled: false, accounts,
        pagination: { per_page: perPage, next_after_cursor: nextCursor, complete: nextCursor === null }
      };
    } catch (error) {
      lastError = error instanceof ModernTreasuryError ? error.code : 'modern_treasury_unavailable';
      if (error instanceof ModernTreasuryError) throw error;
      fail(lastError);
    }
  }

  return Object.freeze({ status, verifyConnection, listInternalAccounts, describeKeyPolicy });
}
