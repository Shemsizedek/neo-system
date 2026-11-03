// NEO Terminal institutional gateway. Read-only, source-attributed, fail-closed.
// Public Bitcoin and Counterparty evidence must not be represented as Crown Chain or accounting attestations.
export const TREASURY_WALLET='18FyntJG9hdXYvanm67mGgbyo1P7adckvg';
export const ORANGE_CHIP_WALLET='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8';
export const DEFAULT_SOURCES=Object.freeze({
 bitcoin:'https://mempool.space/api',
 counterparty:'https://api.counterparty.io:4000/v2',
});
export const validTxid=value=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
export const validAsset=value=>typeof value==='string'&&/^[A-Za-z0-9._-]{1,64}$/.test(value);
export const validAddress=value=>typeof value==='string'&&/^[a-zA-Z0-9]{26,90}$/.test(value);
export const asRecords=data=>Array.isArray(data)?data:Array.isArray(data?.result)?data.result:Array.isArray(data?.data)?data.data:Array.isArray(data?.result?.issuances)?data.result.issuances:[];
export async function getJson(url,{fetchImpl=fetch,timeoutMs=10000}={}){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{const r=await fetchImpl(url,{signal:ctrl.signal,headers:{accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}
}
export function evidence(source,reference,record,observedAt=new Date().toISOString()){
 return {source,reference,record,observedAt,verifiedBy:'PUBLIC_API_OBSERVATION',scope:'ON_CHAIN_ONLY'};
}
export async function bitcoinTransaction(txid,opts={}){
 if(!validTxid(txid))throw Error('Bitcoin transaction ID must be 64 hexadecimal characters');
 const base=opts.bitcoinBase||DEFAULT_SOURCES.bitcoin;
 const data=await getJson(base+'/tx/'+encodeURIComponent(txid),opts);
 if(String(data?.txid??'').toLowerCase()!==txid.toLowerCase())throw Error('Bitcoin transaction ID mismatch');
 const confirmed=data?.status?.confirmed===true;
 return evidence('BITCOIN',txid,{txid:data.txid,confirmed,blockHeight:confirmed?data.status.block_height??null:null,blockHash:confirmed?data.status.block_hash??null:null,feeSats:data.fee??null});
}
export async function counterpartyAsset(asset,opts={}){
 if(!validAsset(asset))throw Error('Invalid Counterparty asset name');
 const base=opts.counterpartyBase||DEFAULT_SOURCES.counterparty;
 const data=await getJson(base+'/assets/'+encodeURIComponent(asset),opts);
 const item=Array.isArray(data?.result)?data.result[0]:data?.result;
 if(!item||typeof item!=='object'||String(item.asset??'').toUpperCase()!==asset.toUpperCase())throw Error('Counterparty asset not returned by provider');
 return evidence('COUNTERPARTY',asset,{asset:item.asset,issuer:item.issuer??item.owner??null,locked:item.locked??null,divisible:item.divisible??null,description:item.description??null});
}
export async function issuerIssuances(address,opts={}){
 if(!validAddress(address))throw Error('Invalid issuer address');
 const base=opts.counterpartyBase||DEFAULT_SOURCES.counterparty;
 const data=await getJson(base+'/addresses/'+encodeURIComponent(address)+'/issuances?limit=100',opts);
 const records=asRecords(data).filter(r=>String(r.source??r.issuer??'')===address&&String(r.status??'valid').toLowerCase()==='valid');
 return evidence('COUNTERPARTY',address,{records:records.map(r=>({asset:r.asset??null,txHash:r.tx_hash??null,blockIndex:r.block_index??null,quantity:r.quantity_normalized??r.quantity??null})),pagination:'FIRST_PAGE_ONLY'});
}
export const internalService=(name)=>({service:name,status:'NOT_CONNECTED',reason:'No authenticated NEO service adapter configured; cannot attest or reconcile.'});
export function reconcileEvidence({bitcoin,counterparty,crownChain,ledger,books}={}){
 const entries=[bitcoin,counterparty].filter(Boolean);
 return {status:'OBSERVATION_ONLY',onChainEvidence:entries,attestation:crownChain??internalService('NEO Crown Chain'),journal:ledger??internalService('NEO Ledger'),accounting:books??internalService('NEO Books'),reconciled:false,reason:'Independent identity-bound attestations, ledger journal, and books reconciliation are required.'};
}
