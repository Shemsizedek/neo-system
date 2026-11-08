import { verifyBitcoinRpcEvidence } from '../neo-prime/bitcoin-rpc-verifier.mjs';

const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const reject = reason => { throw new Error(`payment_verifier:${reason}`); };
function atomic(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && /^[1-9][0-9]{0,77}$/.test(value)) return value;
  reject('invalid_atomic_quantity');
}
function satoshis(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 21_000_000) reject('invalid_btc_value');
  const decimal = value.toFixed(8);
  if (Number(decimal) !== value) reject('invalid_btc_precision');
  const [whole, fraction] = decimal.split('.');
  return (BigInt(whole) * 100_000_000n + BigInt(fraction)).toString();
}

/** Fixed, server-configured v2 reader. No credentials, redirects or caller URLs. */
export function createCounterpartyPaymentReader({ baseUrl, fetchImpl = fetch } = {}) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) reject('invalid_counterparty_base');
  base.pathname = base.pathname.replace(/\/$/, '') + '/';
  return async path => {
    if (!/^(?:$|blocks\/[0-9]+|transactions\/[a-f0-9]{64}\/sends\?limit=1000&verbose=true)$/.test(path)) reject('unsupported_counterparty_read');
    const response = await fetchImpl(new URL(path, base).href, { method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) reject('counterparty_unavailable');
    const body = await response.json();
    if (!body || body.error || !Object.hasOwn(body, 'result')) reject('invalid_counterparty_response');
    // Never silently verify a truncated set of sends.
    if (body.next_cursor !== undefined && body.next_cursor !== null) reject('counterparty_pagination_required');
    return body.result;
  };
}

/** Trusted Bitcoin Core RPC + operator-configured Counterparty v2 node only. */
export function createCheckoutPaymentVerifier({ rpc, counterpartyGet, now = () => new Date() } = {}) {
  if (typeof rpc !== 'function') reject('trusted_bitcoin_rpc_required');
  return async (order, reference) => {
    if (order?.network !== 'bitcoin-mainnet' || !['BTC', 'COUNTERPARTY'].includes(order.rail) ||
        !hash(reference?.txid) || !Number.isSafeInteger(reference.eventIndex) || reference.eventIndex < 0 ||
        !Number.isSafeInteger(order.minConfirmations) || order.minConfirmations < 1) reject('unsupported_payment');
    const chain = await rpc('getblockchaininfo', []);
    if (chain?.chain !== 'main' || chain.initialblockdownload !== false || !Number.isSafeInteger(chain.blocks) || chain.blocks <= 0 || chain.headers !== chain.blocks) reject('bitcoin_node_not_ready');
    const tx = await rpc('getrawtransaction', [reference.txid, true]);
    if (tx?.txid !== reference.txid || !hash(tx.blockhash) || !Number.isSafeInteger(tx.confirmations) || tx.confirmations < order.minConfirmations) reject('transaction_not_confirmed');
    const header = await rpc('getblockheader', [tx.blockhash, true]);
    if (header?.hash !== tx.blockhash || !Number.isSafeInteger(header.height) || header.height <= 0 ||
        !Number.isSafeInteger(header.time) || header.time <= 0 || header.confirmations !== tx.confirmations ||
        await rpc('getblockhash', [header.height]) !== tx.blockhash) reject('active_block_mismatch');

    let destination, amountAtomic;
    if (order.rail === 'BTC') {
      if (order.asset !== 'BTC' || !Array.isArray(tx.vout)) reject('invalid_btc_output');
      const outputs = tx.vout.filter(output => output?.n === reference.eventIndex);
      if (outputs.length !== 1 || typeof outputs[0].scriptPubKey?.address !== 'string') reject('invalid_btc_output');
      destination = outputs[0].scriptPubKey.address;
      amountAtomic = satoshis(outputs[0].value);
    } else {
      if (typeof counterpartyGet !== 'function') reject('trusted_counterparty_reader_required');
      const status = await counterpartyGet('');
      if (status?.network !== 'mainnet' || status.server_ready !== true || status.ledger_state !== 'Following' ||
          !Number.isSafeInteger(status.backend_height) || status.backend_height < chain.blocks ||
          status.counterparty_height !== status.backend_height) reject('counterparty_node_not_ready');
      const block = await counterpartyGet(`blocks/${header.height}`);
      if (block?.block_index !== header.height || block.block_hash !== tx.blockhash) reject('counterparty_block_mismatch');
      const sends = await counterpartyGet(`transactions/${reference.txid}/sends?limit=1000&verbose=true`);
      if (!Array.isArray(sends)) reject('invalid_counterparty_sends');
      // msg_index is the canonical send locator. Ambiguous MPMA rows fail closed.
      const matches = sends.filter(row => row?.msg_index === reference.eventIndex);
      if (matches.length !== 1) reject('ambiguous_or_missing_send');
      const send = matches[0];
      if (send.tx_hash !== reference.txid || send.block_index !== header.height || send.status !== 'valid' ||
          send.asset !== order.asset || typeof send.asset_info?.divisible !== 'boolean') reject('invalid_counterparty_send');
      destination = send.destination;
      amountAtomic = atomic(send.quantity);
    }
    if (destination !== order.destination || !/^[1-9][0-9]{0,77}$/.test(order.amountAtomic) || BigInt(amountAtomic) < BigInt(order.amountAtomic)) reject('payment_does_not_match_order');
    // Reuse the existing independent Bitcoin inclusion verifier as the final read.
    const inclusion = await verifyBitcoinRpcEvidence({ source: 'neo-scan', network: 'mainnet', txid: tx.txid,
      blockHash: tx.blockhash, confirmations: tx.confirmations, observedAt: now().toISOString(), asset: 'BTC' },
    { rpc, minimumConfirmations: order.minConfirmations });
    if (!inclusion.verified) reject('bitcoin_inclusion_changed');
    return Object.freeze({ ...reference, network: order.network, rail: order.rail, asset: order.asset, destination,
      amountAtomic, confirmed: true, confirmations: inclusion.confirmations, blockHash: inclusion.blockHash,
      blockTime: new Date(header.time * 1000).toISOString() });
  };
}
