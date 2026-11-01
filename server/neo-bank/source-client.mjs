// Server-only client. Credentials and the upstream origin never enter a browser response.
export class BankSourceError extends Error {
  constructor(code, status = 502) {
    const known = ['source_invalid_response', 'source_not_configured', 'source_redirect_rejected', 'source_authorization_failed', 'source_not_ready', 'source_login_blocked', 'source_unavailable', 'source_authentication_unverified'];
    super(known.includes(code) ? code : 'source_unavailable'); this.status = status === 503 ? 503 : 502;
  }
}
const columns = ['Months', 'Month-Year', 'Trades', 'NEO', 'Average', 'Levy', 'Total (- Levy)', 'Total'];
function connection(env) {
  try {
    const url = new URL(env.NEO_BANK_SOURCE_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || env.NEO_BANK_SOURCE_TOKEN?.length < 32 || !env.NEO_BANK_SOURCE_TOKEN) return null;
    return { origin: url.origin, token: env.NEO_BANK_SOURCE_TOKEN };
  } catch { return null; }
}
async function readJson(response) {
  const chunks = []; let size = 0;
  for await (const chunk of response.body || []) {
    size += chunk.length;
    if (size > 262144) throw new BankSourceError('source_invalid_response');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function reportView(value) {
  if (!value || !/^[a-f0-9]{64}$/.test(value.id) || !Number.isFinite(Date.parse(value.observedAt)) || value.unit !== 'NEO' || value.recordType !== 'historical-trading-summary' || JSON.stringify(value.columns) !== JSON.stringify(columns) || !Array.isArray(value.monthlyRows) || value.monthlyRows.length < 1 || value.monthlyRows.length > 250 || value.rowCount !== value.monthlyRows.length) throw new BankSourceError('source_invalid_response');
  const rows = value.monthlyRows.map(row => {
    if (!Array.isArray(row) || row.length !== 8 || row.some(cell => typeof cell !== 'string') || !/^\d+$/.test(row[0]) || !/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(row[1]) || !/^\d+$/.test(row[2]) || row.slice(3).some(cell => !/^-?\d{1,40}\.\d{2}$/.test(cell))) throw new BankSourceError('source_invalid_response');
    return [...row];
  });
  return { id: value.id, observedAt: new Date(value.observedAt).toISOString(), rowCount: rows.length, unit: 'NEO', recordType: 'historical-trading-summary', columns: [...columns], monthlyRows: rows };
}
export function createBankSourceClient({ env = process.env, fetchImpl = fetch } = {}) {
  const config = connection(env);
  async function request(path, method = 'GET') {
    if (!config) throw new BankSourceError('source_not_configured', 503);
    try {
      const response = await fetchImpl(config.origin + path, { method, redirect: 'manual', headers: { accept: 'application/json', authorization: 'Bearer ' + config.token }, signal: AbortSignal.timeout(30000) });
      if (path === '/v1/reports/trading/latest' && response.status === 404) return null;
      if (response.status >= 300 && response.status < 400) throw new BankSourceError('source_redirect_rejected');
      const body = await readJson(response);
      if (!response.ok) {
        const code = response.status === 401 ? 'source_authorization_failed' : response.status === 503 ? 'source_not_ready' : body?.diagnostic?.httpStatus === 403 ? 'source_login_blocked' : 'source_unavailable';
        throw new BankSourceError(code, response.status === 503 ? 503 : 502);
      }
      return body;
    } catch (error) {
      if (error instanceof BankSourceError) throw error;
      throw new BankSourceError('source_unavailable');
    }
  }
  return {
    configured: Boolean(config),
    async status() {
      if (!config) return { configured: false, runtimeReachable: false, authenticationVerified: false };
      const body = await request('/v1/status');
      if (body?.exchangeId !== 'NMNI' || typeof body.credentialsConfigured !== 'boolean') throw new BankSourceError('source_invalid_response');
      return { configured: true, runtimeReachable: true, credentialsConfigured: body.credentialsConfigured, authenticationVerified: false };
    },
    async verify() {
      const body = await request('/v1/auth/check', 'POST');
      const proof = body?.proof;
      if (proof?.exchangeId !== 'NMNI' || proof.memberAuthenticated !== true || proof.adminAuthenticated !== true || !Number.isFinite(Date.parse(proof.verifiedAt))) throw new BankSourceError('source_authentication_unverified');
      return { authenticated: true, administrator: true, verifiedAt: new Date(proof.verifiedAt).toISOString() };
    },
    async report() {
      const body = await request('/v1/reports/trading/latest');
      return body === null ? null : reportView(body.report);
    }
  };
}
