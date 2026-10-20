// NMASK-037: fail-closed, read-only chain and asset reconciliation.
// Caller must obtain source observations from independently authenticated server providers.
const HASH=/^[a-f0-9]{64}$/i;
const UINT=/^(0|[1-9][0-9]*)$/;
export function reconcileChain({bitcoin,counterparty,maxLag=2}){
 if(!bitcoin||!counterparty||bitcoin.authenticated!==true||counterparty.authenticated!==true)throw Error('untrusted_source');
 if(!['bitcoin','signet','regtest'].includes(bitcoin.network)||bitcoin.network!==counterparty.network)throw Error('network_mismatch');
 if(!Number.isSafeInteger(bitcoin.height)||!Number.isSafeInteger(counterparty.height)||bitcoin.height<0||counterparty.height<0)throw Error('invalid_height');
 if(!HASH.test(bitcoin.tipHash)||!HASH.test(counterparty.tipHash))throw Error('invalid_tip_hash');
 const lag=bitcoin.height-counterparty.height;
 if(lag<0||lag>maxLag)throw Error('counterparty_not_synchronized');
 if(lag===0&&bitcoin.tipHash.toLowerCase()!==counterparty.tipHash.toLowerCase())throw Error('chain_fork_or_stale_index');
 if(lag>0)throw Error('counterparty_tip_not_reconciled');
 return Object.freeze({network:bitcoin.network,height:bitcoin.height,tipHash:bitcoin.tipHash.toLowerCase(),verified:true});
}
export function reconcileAssets({chain,balances,registry,address}){
 if(chain?.verified!==true||typeof address!=='string'||!address)throw Error('unverified_chain_or_address');
 if(!Array.isArray(balances)||balances.length>1000||!Array.isArray(registry))throw Error('invalid_asset_inputs');
 const byName=new Map(registry.map(r=>[r.asset,r]));
 const seen=new Set();
 return Object.freeze(balances.map(b=>{
  if(!b||typeof b.asset!=='string'||seen.has(b.asset))throw Error('duplicate_or_invalid_asset');
  seen.add(b.asset);
  if(!UINT.test(String(b.atomicUnits)))throw Error('invalid_quantity');
  if(b.address!==address)throw Error('balance_address_mismatch');
  const meta=byName.get(b.asset);
  if(!meta||meta.verified!==true||!Number.isInteger(meta.divisibility)||meta.divisibility<0||meta.divisibility>18)throw Error('asset_metadata_unverified');
  if(!['BTC','XCP'].includes(b.asset)&&(!meta.issuer||meta.issuerVerified!==true))throw Error('issuer_provenance_unverified');
  return Object.freeze({asset:b.asset,atomicUnits:String(b.atomicUnits),divisibility:meta.divisibility,issuer:meta.issuer||null,chainHeight:chain.height});
 }));
}
export function classifyTransactions({chain,transactions}){
 if(chain?.verified!==true||!Array.isArray(transactions)||transactions.length>500)throw Error('invalid_history');
 return transactions.map(t=>{
  if(!HASH.test(t.txid)||!Number.isSafeInteger(t.height)||t.height<0||t.height>chain.height)throw Error('invalid_transaction');
  const confirmations=t.height===0?0:chain.height-t.height+1;
  return Object.freeze({txid:t.txid,confirmations,status:confirmations===0?'pending':confirmations<6?'confirming':'confirmed'});
 });
}
