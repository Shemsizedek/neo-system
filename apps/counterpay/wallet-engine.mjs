/**
 * CounterPay read-only Counterparty v2 adapter.
 * No secrets, signing, transaction creation or broadcast capability.
 */
export const ENDPOINTS = Object.freeze({
  mainnet: 'https://api.counterparty.io:4000/v2',
  testnet: 'https://api-testnet.counterparty.io:14000/v2',
});
export function ensurePublicAddress(address, network) {
  if (typeof address !== 'string' || address.length > 90 || address.length < 26) throw Error('Invalid public address length');
  const value = address.trim();
  if (/\s/.test(value) || /[^a-zA-Z0-9]/.test(value)) throw Error('Public address contains invalid characters');
  const isMain = /^(bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(value);
  const isTest = /^(tb1[ac-hj-np-z02-9]{11,87}|[mn2][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(value);
  if (network === 'mainnet' && !isMain || network === 'testnet' && !isTest) throw Error('Address format does not match selected network');
  if (!['mainnet','testnet'].includes(network)) throw Error('Select a supported read-only network');
  // Format-only validation. A checksum-aware validator is required before signing.
  return value;
}
export function parseBalances(payload) {
  if (!payload || !Array.isArray(payload.result)) throw Error('Unexpected Counterparty balance response');
  return payload.result.map(row => {
    if (!row || typeof row.asset !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(row.asset)) throw Error('Invalid asset record');
    const quantity = row.quantity_normalized ?? row.quantity;
    if (quantity == null || !/^(?:\d+)(?:\.\d+)?$/.test(String(quantity))) throw Error('Invalid quantity');
    return {asset: row.asset, quantity: String(quantity)};
  });
}
export async function fetchBalances({address,network,fetchImpl=fetch,signal,limit=100}) {
  const checked = ensurePublicAddress(address,network);
  const base = ENDPOINTS[network];
  const all = [];
  let cursor = null;
  for (let page=0;page<20;page++) {
    const url = new URL(base+'/addresses/'+encodeURIComponent(checked)+'/balances');
    url.searchParams.set('verbose','true');
    url.searchParams.set('limit',String(Math.min(1000,Math.max(1,limit))));
    if (cursor) url.searchParams.set('cursor',cursor);
    const response = await fetchImpl(url.toString(), {method:'GET',headers:{Accept:'application/json'},signal});
    if (response.status === 503) throw Error('Counterparty node is synchronizing (503)');
    if (!response.ok) throw Error('Counterparty API HTTP '+response.status);
    const ready=response.headers?.get?.('X-COUNTERPARTY-READY');
    if (ready === 'false') throw Error('Counterparty node is not synchronized');
    const body = await response.json();
    all.push(...parseBalances(body));
    if (!body.next_cursor) return {assets:all,partial:false,network};
    if (String(body.next_cursor)===cursor) throw Error('Counterparty pagination cursor did not advance');
    cursor = String(body.next_cursor);
  }
  return {assets:all,partial:true,network};
}
