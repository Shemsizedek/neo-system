import { COUNTERPARTY_MAX_RAW } from '../../server/neo-tokenworks/retokenization.mjs';

const API = 'https://api.counterparty.io:4000/v2';
const symbols = ['HALI', 'TSDU', 'WAYA'];

// Node 24 JSON source context keeps integer ledger quantities exact beyond 2^53.
export function parseCounterpartyJson(text) {
  return JSON.parse(text, (key, value, context) => {
    if (['supply', 'quantity'].includes(key) && typeof value === 'number') {
      if (!/^\d+$/.test(context.source)) throw new Error('raw_integer_quantity_required');
      return context.source;
    }
    return value;
  });
}

async function read(fetchImpl, path) {
  const response = await fetchImpl(API + path, { method: 'GET', redirect: 'error', headers: { accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
  if (response.status !== 200 && response.status !== 404) throw new Error(`counterparty_http_${response.status}`);
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 128 * 1024) throw new Error('counterparty_response_too_large');
    chunks.push(Buffer.from(chunk));
  }
  return { response, data: parseCounterpartyJson(Buffer.concat(chunks).toString('utf8')) };
}

const height = value => /^\d{1,10}$/.test(String(value ?? '')) ? Number(value) : null;
function observationState(response) {
  const counterpartyHeight = height(response.headers.get('x-counterparty-height'));
  const bitcoinHeight = height(response.headers.get('x-bitcoin-height'));
  return {
    ready: response.headers.get('x-counterparty-ready')?.toLowerCase() === 'true' && counterpartyHeight !== null && bitcoinHeight !== null && bitcoinHeight >= counterpartyHeight && bitcoinHeight - counterpartyHeight <= 1,
    counterpartyHeight, bitcoinHeight
  };
}

export async function readCounterpartyPreflight({ fetchImpl = fetch, now = () => new Date().toISOString() } = {}) {
  const report = {
    schema: 'neo.retokenization.preflight.v1', observedAt: now(), api: API,
    network: 'mainnet', nodeVerified: false, node: null, assets: [],
    issuerControlVerified: false, namesReserved: false, executionEnabled: false
  };
  try {
    const root = await read(fetchImpl, '/');
    const node = root.data?.result;
    const state = observationState(root.response);
    if (root.response.status !== 200 || node?.network !== 'mainnet' || node.server_ready !== true || !state.ready) throw new Error('counterparty_mainnet_node_not_ready');
    report.nodeVerified = true;
    report.node = { ...state, version: typeof node.version === 'string' ? node.version : null };
  } catch (error) {
    report.error = error.message;
    report.assets = symbols.map(asset => ({ asset, state: 'UNVERIFIED', error: 'node_unverified' }));
    return { ...report, ok: false };
  }
  const results = await Promise.allSettled(symbols.map(async asset => {
    const { response, data } = await read(fetchImpl, `/assets/${asset}`);
    const observed = observationState(response);
    if (!observed.ready) throw new Error('counterparty_asset_observation_not_ready');
    const common = { asset, ...observed, sourceUrl: `${API}/assets/${asset}`, ownerControlVerified: false };
    if (response.status === 404 && data?.error === 'Not found') return { ...common, state: 'NOT_FOUND_OBSERVED', nameReserved: false };
    const row = data?.result;
    if (response.status !== 200 || row?.asset !== asset || typeof row.owner !== 'string' || !row.owner || typeof row.issuer !== 'string' || !row.issuer || typeof row.divisible !== 'boolean' || typeof row.locked !== 'boolean' || typeof row.supply !== 'string' || !/^\d{1,19}$/.test(row.supply) || BigInt(row.supply) > COUNTERPARTY_MAX_RAW) throw new Error('counterparty_asset_response_invalid');
    return { ...common, state: 'REGISTERED_REQUIRES_OWNER_PROOF', owner: row.owner, issuer: row.issuer, divisible: row.divisible, locked: row.locked, supplyRawUnits: row.supply };
  }));
  report.assets = results.map((result, index) => result.status === 'fulfilled' ? result.value : { asset: symbols[index], state: 'UNVERIFIED', error: result.reason?.message || 'counterparty_read_failed' });
  return { ...report, ok: results.every(result => result.status === 'fulfilled') };
}
