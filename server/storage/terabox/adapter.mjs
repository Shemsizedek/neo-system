const DEFAULT_BASE = 'https://www.terabox.com';

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function encodeQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
  }
  return search;
}

export class TeraBoxAdapter {
  constructor({ accessToken, apiDomain = DEFAULT_BASE, uploadDomain, fetchImpl = globalThis.fetch } = {}) {
    this.accessToken = required(accessToken ?? process.env.TERABOX_ACCESS_TOKEN, 'TeraBox access token');
    this.apiDomain = apiDomain.replace(/\/$/, '');
    this.uploadDomain = uploadDomain?.replace(/\/$/, '');
    this.fetch = required(fetchImpl, 'fetch implementation');
  }

  async request(path, { method = 'GET', query = {}, body, headers = {}, domain } = {}) {
    const base = (domain ?? this.apiDomain).replace(/\/$/, '');
    const qs = encodeQuery({ access_tokens: this.accessToken, ...query });
    const url = `${base}${path}?${qs.toString()}`;

    const response = await this.fetch(url, {
      method,
      headers: { Accept: 'application/json', ...headers },
      body,
    });

    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }

    if (!response.ok) {
      const error = new Error(`TeraBox HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (typeof payload?.errno === 'number' && payload.errno !== 0) {
      const error = new Error(payload.show_msg || payload.errmsg || `TeraBox errno ${payload.errno}`);
      error.errno = payload.errno;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  async userInfo() {
    return this.request('/openapi/uinfo');
  }

  async quota() {
    return this.request('/openapi/api/quota');
  }

  async list({ dir, page = 1, num = 100, order = 'time', desc = 1, web = 1 }) {
    required(dir, 'dir');
    return this.request('/openapi/api/list', { query: { dir, page, num, order, desc, web } });
  }

  async search({ key, page = 1, num = 100, order = 'time', desc = 1, recursion = 1 }) {
    required(key, 'key');
    return this.request('/openapi/api/search', { query: { key, page, num, order, desc, recursion } });
  }

  async downloadLinks(fids) {
    if (!Array.isArray(fids) || fids.length === 0) throw new Error('fids must be a non-empty array');
    return this.request('/openapi/api/download', { query: { fidlist: fids, type: 'dlink' } });
  }

  async fileManager({ operation, filelist, asyncMode = 1 }) {
    if (!['copy', 'move', 'rename', 'delete'].includes(operation)) throw new Error('Unsupported file operation');
    required(filelist, 'filelist');
    const body = new URLSearchParams({ filelist: JSON.stringify(filelist) });
    return this.request('/openapi/api/filemanager', {
      method: 'POST',
      query: { opera: operation, async: asyncMode },
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  setDomains({ apiDomain, uploadDomain }) {
    if (apiDomain) this.apiDomain = apiDomain.replace(/\/$/, '');
    if (uploadDomain) this.uploadDomain = uploadDomain.replace(/\/$/, '');
    return { apiDomain: this.apiDomain, uploadDomain: this.uploadDomain };
  }
}

export function createTeraBoxAdapter(options = {}) {
  return new TeraBoxAdapter(options);
}
