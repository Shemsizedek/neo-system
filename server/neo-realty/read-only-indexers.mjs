/** Read-only Bitcoin status adapter. No wallet keys or signing. */
const TXID=/^[a-f0-9]{64}$/i;
export function createBitcoinIndexer({baseUrl='https://mempool.space/api',fetchFn=fetch,timeoutMs=7000}={}) {
 const endpoint=new URL(baseUrl);
 if(endpoint.protocol!=='https:' && endpoint.hostname!=='127.0.0.1')throw new Error('HTTPS indexer required');
 const get=async path=>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{const res=await fetchFn(new URL(endpoint.pathname.replace(/\/$/,'')+path,endpoint),{signal:controller.signal,headers:{accept:'application/json'},redirect:'error'});if(!res.ok)throw Error('Indexer HTTP '+res.status);return await res.json();}
  finally{clearTimeout(timeout);}
 };
 return {async lookup(txid){
  if(!TXID.test(txid))throw Error('Invalid Bitcoin transaction ID');
  const [tx,tip]=await Promise.all([get('/tx/'+txid),get('/blocks/tip/height')]);
  if(tx?.txid!==txid)throw Error('Indexer txid mismatch');
  const blockHeight=tx.status?.block_height;
  const confirmed=tx.status?.confirmed===true&&Number.isSafeInteger(blockHeight)&&blockHeight>0;
  const confirmations=confirmed&&Number.isSafeInteger(tip)&&tip>=blockHeight?tip-blockHeight+1:0;
  return {txid,confirmations,blockHash:confirmed?tx.status.block_hash:null,source:endpoint.origin,readOnly:true};
 }};
}
/**
 * Counterparty reader requires a deployment-specific decoder mapping.
 * Normalized payload must be supplied by a trusted decoding implementation,
 * not an unverified user-provided JSON object.
 */
export function createCounterpartyReader({fetchTransaction}) {
 if(typeof fetchTransaction!=='function')throw Error('Trusted Counterparty decoder required');
 return {async lookup(txid){
  if(!TXID.test(txid))throw Error('Invalid transaction ID');
  const event=await fetchTransaction(txid);
  if(!event || event.btcTxid!==txid || event.asset!=='NOMNI' || event.status!=='valid')return {valid:false,btcTxid:txid};
  if(!Number.isSafeInteger(event.quantityBaseUnits)||event.quantityBaseUnits<=0)return {valid:false,btcTxid:txid};
  return {btcTxid:txid,asset:'NOMNI',quantityBaseUnits:event.quantityBaseUnits,destination:event.destination,valid:true,readOnly:true};
 }};
}
