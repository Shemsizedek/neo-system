// NEO-BMI-004: defensive, read-only Bitcoin Core evidence adapter.
// Requires an operator-controlled, fully validated Bitcoin Core RPC node.
const hex64 = /^[0-9a-f]{64}$/i;
const txid = v => typeof v === 'string' && hex64.test(v);
function assertHash(v, label) { if (!txid(v)) throw new Error(label + ' must be a 64-character hexadecimal hash'); return v.toLowerCase(); }
function assertHeight(v) { if (!Number.isSafeInteger(v) || v < 0) throw new Error('invalid block height'); }
export function createBitcoinCoreAdapter({ rpc, minConfirmations = 6, expectedGenesis = '000000000019d6689c085ae165831e93' + '4ff763ae46a2a6c172b3f1b60a8ce26f' } = {}) {
  if (typeof rpc !== 'function') throw new TypeError('RPC function required');
  if (!Number.isSafeInteger(minConfirmations) || minConfirmations < 1) throw new Error('invalid confirmation requirement');
  async function checkNetwork() {
    const genesis = await rpc('getblockhash', [0]);
    if (genesis?.toLowerCase() !== expectedGenesis) throw new Error('Bitcoin chain genesis mismatch');
  }
  return {
    async getTransaction(id) {
      const normalized = assertHash(id, 'transaction id');
      await checkNetwork();
      let tx;
      try { tx = await rpc('getrawtransaction', [normalized, true]); }
      catch (error) { return { txid: normalized, network: 'bitcoin-mainnet', confirmed: false, reason: 'transaction lookup unavailable' }; }
      if (!tx || tx.txid?.toLowerCase() !== normalized || !tx.blockhash) return { txid: normalized, network: 'bitcoin-mainnet', confirmed: false };
      const hash = assertHash(tx.blockhash, 'blockhash');
      const header = await rpc('getblockheader', [hash, true]);
      if (!header || !Number.isSafeInteger(header.height) || header.height < 0) throw new Error('invalid block header response');
      assertHeight(header.height);
      const chainTip = await rpc('getblockcount', []);
      assertHeight(chainTip);
      const canonicalHash = await rpc('getblockhash', [header.height]);
      const confirmations = chainTip - header.height + 1;
      const canonical = canonicalHash?.toLowerCase() === hash && confirmations >= 1;
      return { txid: normalized, network: 'bitcoin-mainnet', confirmed: canonical && confirmations >= minConfirmations, confirmations: canonical ? confirmations : 0, blockhash: hash, blockheight: header.height, canonical, evidenceSource: 'operator-bitcoin-core-rpc' };
    },
    async recheckAnchor(anchor) {
      if (!anchor?.txid) throw new Error('anchor txid required');
      const current = await this.getTransaction(anchor.txid);
      return { ...current, reorgDetected: Boolean(anchor.blockhash && current.blockhash !== anchor.blockhash) || current.canonical === false };
    }
  };
}
export function createReadOnlyRpc({ endpoint, username, password, fetchImpl = fetch, timeoutMs = 8000 }) {
  const url = new URL(endpoint);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported RPC protocol');
  // RPC must remain privately networked; caller controls TLS and access policy.
  if (!username || !password) throw new Error('RPC authentication required');
  return async (method, params = []) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const authorization = Buffer.from(username + ':' + password).toString('base64');
      const response = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Basic ' + authorization }, body: JSON.stringify({ jsonrpc: '1.0', id: 'neo-bmi-readonly', method, params }), signal: controller.signal });
      if (!response.ok) throw new Error('Bitcoin RPC HTTP error ' + response.status);
      const parsed = await response.json();
      if (parsed.error) throw new Error('Bitcoin RPC returned an error');
      return parsed.result;
    } finally { clearTimeout(timeout); }
  };
}
// Counterparty responses are provider hints, not independently validated consensus proofs.
export function createCounterpartyReadOnlyAdapter({ retrieve }) {
  if (typeof retrieve !== 'function') throw new TypeError('Counterparty retrieval function required');
  return { async getIssuance(asset) {
    if (typeof asset !== 'string' || !/^[A-Z0-9._-]{1,64}$/.test(asset)) throw new Error('invalid asset name');
    const result = await retrieve(asset);
    const records = Array.isArray(result) ? result : result?.result;
    if (!Array.isArray(records)) return null;
    const match = records.find(item => item && item.asset === asset && txid(item.tx_hash));
    return match ? { asset: match.asset, tx_hash: match.tx_hash.toLowerCase(), source: 'counterparty-provider-unverified' } : null;
  }};
}
export async function verifyWithChainRecheck(record, adapters) {
  if (!record?.bitcoinTxid || !txid(record.bitcoinTxid)) return { status: 'NOT_VERIFIED', reason: 'invalid Bitcoin anchor' };
  if (!adapters?.bitcoin?.getTransaction || !adapters?.bitcoin?.recheckAnchor) throw new Error('Bitcoin Core adapter required');
  const first = await adapters.bitcoin.getTransaction(record.bitcoinTxid);
  if (!first.confirmed || !first.canonical) return { status: 'NOT_VERIFIED', reason: 'Bitcoin anchor not canonical or sufficiently confirmed' };
  if (record.classification === 'BITCOIN_COUNTERPARTY_ASSET') {
    if (!adapters.counterparty?.getIssuance) throw new Error('Counterparty adapter required');
    const issuance = await adapters.counterparty.getIssuance(record.assetId);
    if (!issuance || issuance.tx_hash !== record.bitcoinTxid.toLowerCase() || issuance.asset !== record.assetId) return { status: 'NOT_VERIFIED', reason: 'Counterparty issuance linkage mismatch' };
  }
  const last = await adapters.bitcoin.recheckAnchor(first);
  if (last.reorgDetected || !last.confirmed || !last.canonical || last.blockhash !== first.blockhash) return { status: 'REORG_RECHECK_REQUIRED', reason: 'Bitcoin anchor changed during verification' };
  return { status: 'PROVIDER_EVIDENCE_CORRELATED', confirmations: last.confirmations, blockhash: last.blockhash, reason: 'Bitcoin Core RPC and Counterparty provider evidence correlated; not full independent Counterparty consensus, legal title or reserve proof' };
}
