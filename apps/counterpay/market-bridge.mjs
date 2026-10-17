// COUNTERPAY-005 — read-only DEX + proof commitments; no signing/broadcast.
import { ENDPOINTS, ensurePublicAddress } from './wallet-engine.mjs';
const symbol = value => { if(typeof value!=='string'||!/^(?:[A-Z][A-Z0-9._-]{0,31}|A[0-9]{1,20})$/.test(value))throw Error('Invalid asset'); return value; };
const assertNetwork = value => { if(!Object.hasOwn(ENDPOINTS,value)) throw Error('Unsupported network'); return value; };
async function query(path,{network,fetchImpl=fetch,signal}){
  const base=ENDPOINTS[assertNetwork(network)];const response=await fetchImpl(base+path,{method:'GET',headers:{Accept:'application/json'},signal});
  if(response.status===503||response.headers?.get?.('X-COUNTERPARTY-READY')==='false')throw Error('Counterparty node not ready');
  if(!response.ok)throw Error('Counterparty HTTP '+response.status);
  const json=await response.json();if(!Array.isArray(json?.result))throw Error('Unexpected Counterparty result');
  return Object.freeze({records:json.result,nextCursor:json.next_cursor??null,ledgerHeight:response.headers?.get?.('X-COUNTERPARTY-HEIGHT')??null});
}
export async function getDexOrders({network,baseAsset='XCP',quoteAsset='BTC',fetchImpl=fetch,signal}){
  const a=symbol(baseAsset),b=symbol(quoteAsset);if(a===b)throw Error('Select different assets');
  return query('/orders/'+encodeURIComponent(a)+'/'+encodeURIComponent(b)+'?verbose=true',{network,fetchImpl,signal});
}
export async function getAssetDispensers({network,asset='XCP',fetchImpl=fetch,signal}){
  return query('/assets/'+encodeURIComponent(symbol(asset))+'/dispensers?verbose=true',{network,fetchImpl,signal});
}
// Do not call a composer automatically. A compose GET may reserve/select UTXOs and is
// not sufficient to prove safe spending; explicit caller approval is required.
export function composeSendRequest({network,source,destination,asset,quantity}){
  assertNetwork(network);ensurePublicAddress(source,network);ensurePublicAddress(destination,network);
  symbol(asset);
  if(typeof quantity!=='string'||!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,8})?$/.test(quantity)||!/[1-9]/.test(quantity.replace('.','')))throw Error('Invalid quantity');
  if(source===destination)throw Error('Self-transfer requires separate confirmation workflow');
  const url=new URL(ENDPOINTS[network]+'/addresses/'+encodeURIComponent(source)+'/compose/send');
  for(const [k,v] of Object.entries({destination,asset,quantity}))url.searchParams.set(k,v);
  return Object.freeze({url:url.toString(),method:'GET',execute:false,signed:false,broadcast:false,network,note:'Request descriptor only. Do not fetch without explicit approval and independent parameter and fee validation.'});
}
function canonical(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite number');return JSON.stringify(value)}
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  throw Error('Unsupported evidence type');
}
export async function hashEvidence(envelope,cryptoImpl=globalThis.crypto){
  if(envelope?.schema!=='neo.crown-chain.evidence.v1'||envelope.attested!==false||envelope.anchored!==false)throw Error('Only unattested preview evidence can be hashed');
  if(!cryptoImpl?.subtle?.digest)throw Error('WebCrypto SHA-256 unavailable');
  const bytes=new TextEncoder().encode(canonical(envelope));
  const digest=await cryptoImpl.subtle.digest('SHA-256',bytes);
  return {algorithm:'SHA-256',digestHex:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join(''),schema:envelope.schema,anchored:false,attested:false,contentBytes:bytes.length};
}
