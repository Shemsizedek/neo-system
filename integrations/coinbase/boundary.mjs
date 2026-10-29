/**
 * NEO Project 144: isolated Coinbase gateway boundary.
 * Pure validation only: no network, wallet, secrets, signing, SDK, or transfers.
 * Fail closed on missing/unknown chain, asset, action, and ambiguous destinations.
 */
export const PROVIDER = 'coinbase';
const BTC_NETWORK = 'bitcoin';
const ASSET = 'BTC';
const SERVICES = new Set(['neo-bank', 'neo-pay', 'neo-fx']);
const ACTIONS = new Set(['quote', 'status', 'reconcile', 'deposit-instructions']);
const READ_KEYS = new Set(['provider','service','action','asset','network','reference']);
const DENIED_TERMS = /(?:ethereum|eth|base|evm|erc[ -]?\d+|usdc|cbBTC|wBTC|polygon|optimism|arbitrum|solana|x402|builder.?code)/i;

/** Validate a request before it can be mapped to external provider API calls. */
export function assertCoinbaseBoundary(request) {
  if (request === null || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('Provider request must be an object');
  }
  if (Object.keys(request).some(k => !READ_KEYS.has(k))) {
    throw new Error('Unexpected fields: Coinbase cannot receive NEO internal records or credentials');
  }
  if (request.provider !== PROVIDER) throw new Error('Unapproved provider');
  if (!SERVICES.has(request.service)) throw new Error('Coinbase restricted to NEO Bank, Pay, FX');
  if (!ACTIONS.has(request.action)) throw new Error('Only non-transacting operations are allowed');
  if (request.asset !== ASSET || request.network !== BTC_NETWORK) {
    throw new Error('Only native BTC on Bitcoin is permitted');
  }
  if (request.reference !== undefined &&
      (typeof request.reference !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(request.reference))) {
    throw new Error('Reference must be an opaque non-sensitive identifier');
  }
  if (DENIED_TERMS.test(JSON.stringify(request))) {
    throw new Error('Ethereum, Base, wrapped BTC, and other networks are prohibited');
  }
  return Object.freeze({...request});
}

/** Validate provider asset/network descriptions; BTC-like tickers alone are unsafe. */
export function assertNativeBitcoinAsset(asset) {
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) throw new TypeError('Asset descriptor required');
  if (asset.asset !== ASSET || asset.network !== BTC_NETWORK || asset.native !== true) {
    throw new Error('Reject ambiguous, wrapped, or non-Bitcoin provider asset');
  }
  if (DENIED_TERMS.test(JSON.stringify(asset))) throw new Error('Blocked network or token metadata');
  return true;
}
