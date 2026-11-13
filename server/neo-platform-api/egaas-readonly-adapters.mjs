import { verifyCrownAuthorization } from '../crown-auth/verify.mjs';
import { EGAAS_PUBLISH_SCOPE, checkEgaasPublishingAuthority, verifyEgaasInclusion } from './egaas-verification.mjs';

const HASH = /^[a-f0-9]{64}$/;
const HEIGHT = value => Number.isSafeInteger(value) && value >= 0;
function endpoint(value, { allowLoopbackHttp = false } = {}) {
  const url = new URL(value);
  const local = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(allowLoopbackHttp && local && url.protocol === 'http:')) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('trusted_origin_required');
  return url.origin;
}

/** Bounded transport: no redirects, cookies, error-body reflection, or logging. */
async function requestJson(url, { fetchImpl, method = 'GET', headers = {}, body } = {}) {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 4000);
  let reader;
  try {
    const response = await fetchImpl(url, { method, headers: { ...headers, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', credentials: 'omit', signal: controller.signal });
    if (!response.ok || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw new Error();
    reader = response.body?.getReader();
    if (!reader) throw new Error();
    const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2100000) throw new Error();
      chunks.push(Buffer.from(value));
    }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
    return result;
  } catch { throw new Error('readonly_upstream_unavailable_or_invalid'); }
  finally {
    clearTimeout(deadline);
    if (reader) { try { await reader.cancel(); } catch {} }
  }
}

const validRpcParams = (method, params) => {
  if (!Array.isArray(params)) return false;
  if (method === 'getblockchaininfo') return params.length === 0;
  if (method === 'getblockhash') return params.length === 1 && HEIGHT(params[0]);
  if (method === 'getblockheader' || method === 'getrawtransaction') return params.length === 2 && typeof params[0] === 'string' && HASH.test(params[0]) && params[1] === true;
  if (method === 'gettxoutproof') return params.length === 2 && Array.isArray(params[0]) && params[0].length === 1 &&
    typeof params[0][0] === 'string' && HASH.test(params[0][0]) && typeof params[1] === 'string' && HASH.test(params[1]);
  if (method === 'verifytxoutproof') return params.length === 1 && typeof params[0] === 'string' && params[0].length >= 160 && params[0].length <= 2000000 && /^(?:[a-f0-9]{2})+$/.test(params[0]);
  return false;
};

/** Operator-configured only. Authentication headers stay in the closure. */
export function createEgaasBitcoinReader({ origin, headers = {}, fetchImpl = fetch, allowLoopbackHttp = false } = {}) {
  const url = endpoint(origin, { allowLoopbackHttp });
  const privateHeaders = { ...headers };
  let sequence = 0;
  return async (method, params) => {
    if (!validRpcParams(method, params)) throw new Error('readonly_rpc_method_or_params_rejected');
    const id = `egaas-read-${++sequence}`;
    const response = await requestJson(url, { fetchImpl, method: 'POST', headers: privateHeaders, body: { jsonrpc: '2.0', id, method, params } });
    if (response.id !== id || (response.error !== null && response.error !== undefined) || !Object.hasOwn(response, 'result')) throw new Error('invalid_bitcoin_rpc_response');
    return response.result;
  };
}

function serverInfo(envelope, network) {
  const info = envelope.result;
  if (!info || info.server_ready !== true || info.ledger_state !== 'Following' || info.network !== network || !HEIGHT(info.backend_height) ||
      !HEIGHT(info.counterparty_height) || info.backend_height !== info.counterparty_height) throw new Error('counterparty_not_synchronized');
  return info;
}
function parsedBlock(envelope, height) {
  const block = envelope.result;
  if (!block || block.block_index !== height || typeof block.block_hash !== 'string' || !HASH.test(block.block_hash)) throw new Error('invalid_counterparty_block');
  return block;
}

/** Counterparty Core v2 raw responses normalized to the existing verifier contract. */
export function createEgaasCounterpartyReader({ origin, nodeId, operatorId, network, headers = {}, fetchImpl = fetch, now = Date.now } = {}) {
  const base = endpoint(origin);
  if (![nodeId, operatorId].every(value => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(value)) ||
      !['mainnet', 'testnet', 'signet'].includes(network)) throw new Error('pinned_counterparty_identity_and_network_required');
  const privateHeaders = { ...headers };
  const get = path => requestJson(`${base}/v2/${path}`, { fetchImpl, headers: privateHeaders });
  return Object.freeze({ nodeId, operatorId, origin: base, network,
    async probe() {
      const info = serverInfo(await get(''), network);
      return { network, backendHeight: info.backend_height, parserHeight: info.counterparty_height, ready: true };
    },
    async read({ txid, blockHeight } = {}) {
      if (typeof txid !== 'string' || !HASH.test(txid) || !HEIGHT(blockHeight) || blockHeight < 1) throw new Error('invalid_counterparty_reference');
      const start = serverInfo(await get(''), network);
      if (blockHeight > start.counterparty_height) throw new Error('counterparty_block_not_parsed');
      const broadcast = (await get(`broadcasts/${txid}`)).result;
      if (!broadcast || broadcast.tx_hash !== txid || broadcast.block_index !== blockHeight || broadcast.status !== 'valid' ||
          typeof broadcast.source !== 'string' || !broadcast.source || typeof broadcast.text !== 'string' || broadcast.text.length > 10000) throw new Error('counterparty_valid_broadcast_required');
      const block = parsedBlock(await get(`blocks/${blockHeight}`), blockHeight);
      const tip = parsedBlock(await get(`blocks/${start.counterparty_height}`), start.counterparty_height);
      const end = serverInfo(await get(''), network);
      const finalTip = parsedBlock(await get(`blocks/${end.counterparty_height}`), end.counterparty_height);
      if (start.backend_height !== end.backend_height || start.counterparty_height !== end.counterparty_height || tip.block_hash !== finalTip.block_hash ||
          (blockHeight === start.counterparty_height && block.block_hash !== tip.block_hash)) throw new Error('counterparty_snapshot_changed');
      return { network, txid, blockHash: block.block_hash, blockHeight, status: broadcast.status, source: broadcast.source, text: broadcast.text,
        parserHeight: end.counterparty_height, bitcoinTipHash: finalTip.block_hash, observedAt: new Date(now()).toISOString() };
    },
  });
}

/** Existing Crown verification reused without a challenge, enrollment or signing call. */
export function createEgaasCrownCapabilityReader({ origin, authorization, fetchImpl = fetch } = {}) {
  const base = endpoint(origin);
  if (typeof authorization !== 'string' || !authorization.trim()) throw new Error('protected_crown_authorization_required');
  return async ({ requiredScope } = {}) => {
    if (requiredScope !== EGAAS_PUBLISH_SCOPE) throw new Error('egaas_publishing_scope_required');
    return verifyCrownAuthorization({ authorization, requiredScope, crownOrigin: base,
      fetchImpl: async (url, options) => {
        if (url !== `${base}/api/v1/trust/verify` || options.method !== 'POST') throw new Error('readonly_crown_path_rejected');
        const result = await requestJson(url, { fetchImpl, method: 'POST', body: JSON.parse(options.body) });
        return { ok: true, json: async () => result };
      } });
  };
}

/** Wire trusted staging configuration once, never from an incoming request. */
export function createEgaasReadOnlyReview({ policy, bitcoin, counterparty = [], crown, fetchImpl = fetch, now = Date.now } = {}) {
  const pinnedPolicy = policy ? Object.freeze({ ...policy }) : undefined;
  const rpc = bitcoin ? createEgaasBitcoinReader({ ...bitcoin, fetchImpl }) : undefined;
  const nodes = counterparty.map(config => {
    if (config.network !== pinnedPolicy?.network) throw new Error('counterparty_policy_network_mismatch');
    return createEgaasCounterpartyReader({ ...config, fetchImpl, now });
  });
  const verifyCapability = crown ? createEgaasCrownCapabilityReader({ ...crown, fetchImpl }) : undefined;
  return Object.freeze({
    checkAuthority: () => checkEgaasPublishingAuthority({ policy: pinnedPolicy, verifyCapability, now }),
    checkInclusion: input => verifyEgaasInclusion(input, { policy: pinnedPolicy, rpc, counterpartyNodes: nodes, now }),
  });
}

/** Reuse protected Counterpay backend readers without copying credentials or
 * creating another transport/node. Never wire this from public wallet JSON.
 */
export function createEgaasCounterpayReview({ policy, counterpay, independentCounterpartyReader, verifyCapability, now = Date.now } = {}) {
  const pinnedPolicy = policy ? Object.freeze({ ...policy }) : undefined;
  if (counterpay && counterpay.network !== pinnedPolicy?.network) throw new Error('counterpay_policy_network_mismatch');
  const originalRpc = counterpay?.bitcoinRpc;
  const rpc = typeof originalRpc === 'function' ? async (method, params) => {
    if (!validRpcParams(method, params)) throw new Error('readonly_rpc_method_or_params_rejected');
    return originalRpc(method, params);
  } : undefined;
  const pinReader = reader => {
    if (!reader) return null;
    if (reader.network !== pinnedPolicy?.network || typeof reader.read !== 'function' ||
        ![reader.nodeId, reader.operatorId].every(value => typeof value === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(value))) throw new Error('invalid_counterpay_reader_binding');
    return Object.freeze({ nodeId: reader.nodeId, operatorId: reader.operatorId, network: reader.network,
      origin: endpoint(reader.origin), read: reader.read.bind(reader) });
  };
  const primary = pinReader(counterpay?.counterpartyReader);
  const secondary = pinReader(independentCounterpartyReader);
  if (secondary && !primary) throw new Error('counterpay_primary_reader_required');
  if (primary && secondary && (primary.nodeId === secondary.nodeId || primary.operatorId === secondary.operatorId || primary.origin === secondary.origin)) throw new Error('counterpay_reader_is_not_independent_corroboration');
  const nodes = [primary, secondary].filter(Boolean);
  return Object.freeze({
    status: Object.freeze({ source: 'counterpay', network: pinnedPolicy?.network || null,
      bitcoinReaderBound: Boolean(rpc), primaryCounterpartyReaderBound: Boolean(primary),
      independentCounterpartyReaderBound: Boolean(secondary), liveVerified: false, publishingEnabled: false }),
    checkAuthority: () => checkEgaasPublishingAuthority({ policy: pinnedPolicy, verifyCapability, now }),
    checkInclusion: input => verifyEgaasInclusion(input, { policy: pinnedPolicy, rpc, counterpartyNodes: nodes, now }),
  });
}
