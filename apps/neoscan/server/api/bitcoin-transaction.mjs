import {createBitcoinIndexer} from '../../../../server/neo-realty/read-only-indexers.mjs';
const TXID=/^[a-f0-9]{64}$/i;
export function createTransactionLookup({indexer=createBitcoinIndexer()}={}){
 return async function lookup(txid){
  if(!TXID.test(txid))return {ok:false,error:'Invalid Bitcoin txid',status:400};
  try{
   const tx=await indexer.lookup(txid);
   return {ok:true,status:200,data:{genre:'PAYMENTS',network:'bitcoin',txid:tx.txid,confirmations:tx.confirmations,blockHash:tx.blockHash,verifiedTitle:false,readOnly:true,source:tx.source??'configured-indexer'}};
  }catch{return {ok:false,status:502,error:'Bitcoin indexer unavailable or returned inconsistent evidence'};}
 };
}
