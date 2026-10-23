// NEOPAY-UX-002: public, read-only wallet data boundary.
// A treasury/settlement address is NOT a connected customer's wallet.
const ADDRESS=/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[ac-hj-np-z02-9]{11,87}$/;
export function parseWalletAddress(value){const address=String(value||'').trim();if(!ADDRESS.test(address))throw new Error('unsupported_bitcoin_address');return address;}
export function normalizeWalletSnapshot(payload,{address}={}){
  if(!payload||payload.verified!==true||payload.network!=='bitcoin-mainnet'||payload.address!==address||!Array.isArray(payload.assets)||!Array.isArray(payload.transactions))throw new Error('unverified_wallet_snapshot');
  const assets=payload.assets.map(a=>{
    if(typeof a.asset!=='string'||!a.asset||typeof a.quantity!=='string'||!/^(0|[1-9]\d*)(\.\d+)?$/.test(a.quantity))throw new Error('invalid_asset_quantity');
    return {asset:a.asset,quantity:a.quantity};
  });
  return {address,network:'bitcoin-mainnet',assets,transactions:payload.transactions.map(t=>({txid:String(t.txid||''),status:t.status==='confirmed'?'confirmed':'unconfirmed'})),asOf:String(payload.asOf||'')};
}
export function createReadOnlyWalletController({fetchSnapshot}={}){
  if(typeof fetchSnapshot!=='function')throw new Error('wallet_fetcher_required');
  return {async connect(address){const valid=parseWalletAddress(address);const snapshot=await fetchSnapshot(valid);return normalizeWalletSnapshot(snapshot,{address:valid});}};
}
