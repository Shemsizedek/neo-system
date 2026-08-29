import {markBitcoinEvidenceVerified} from './incidents.mjs'
const now=()=>new Date().toISOString()
const txidPattern=/^[0-9a-f]{64}$/i
export const BITCOIN_RESOLUTION={TX_CONFIRMED:'TX_CONFIRMED',TX_NOT_BROADCAST:'TX_NOT_BROADCAST',TX_REPLACED:'TX_REPLACED'}
const rpcErrorCode=error=>String(error?.message||error||'')
const requireRpc=rpc=>{if(typeof rpc!=='function')throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')}
const requireTxid=txid=>{if(!txidPattern.test(String(txid||'')))throw new Error('INVALID_BITCOIN_TXID');return String(txid).toLowerCase()}
const outpointKey=vin=>vin?.txid&&Number.isInteger(vin?.vout)?`${String(vin.txid).toLowerCase()}:${vin.vout}`:null
const inputsOf=tx=>(tx?.vin||[]).map(outpointKey).filter(Boolean)

async function walletEvidence(txid,rpc){
  requireRpc(rpc);txid=requireTxid(txid)
  try{const tx=await rpc('gettransaction',[txid,true,true]);return {found:true,txid,confirmations:Math.max(0,Number(tx?.confirmations||0)),blockhash:tx?.blockhash||null,abandoned:tx?.abandoned===true,trusted:tx?.trusted===true,source:'gettransaction'}}
  catch(error){const code=rpcErrorCode(error);if(!code.includes('Invalid or non-wallet transaction id')&&!code.includes('BITCOIN_RPC_-5'))throw error;return {found:false,txid,confirmations:0,blockhash:null,source:'gettransaction'}}
}

async function txIndexState(rpc){
  requireRpc(rpc)
  const indexes=await rpc('getindexinfo',[])
  const txindex=indexes?.txindex
  return {enabled:Boolean(txindex),synced:txindex?.synced===true,bestBlockHeight:Number(txindex?.best_block_height??-1),source:'getindexinfo'}
}

async function rawTransactionEvidence(txid,rpc){
  requireRpc(rpc);txid=requireTxid(txid)
  try{const tx=await rpc('getrawtransaction',[txid,true]);return {found:true,txid,confirmations:Math.max(0,Number(tx?.confirmations||0)),blockhash:tx?.blockhash||null,inChain:Boolean(tx?.blockhash),vin:tx?.vin||[],source:'getrawtransaction'}}
  catch(error){const code=rpcErrorCode(error);if(!code.includes('No such mempool or blockchain transaction')&&!code.includes('BITCOIN_RPC_-5'))throw error;return {found:false,txid,confirmations:0,blockhash:null,inChain:false,vin:[],source:'getrawtransaction'}}
}

async function mempoolEvidence(txid,rpc){
  requireRpc(rpc);txid=requireTxid(txid)
  try{const entry=await rpc('getmempoolentry',[txid]);return {found:true,txid,vsize:Number(entry?.vsize||0),source:'getmempoolentry'}}
  catch(error){const code=rpcErrorCode(error);if(!code.includes('Transaction not in mempool')&&!code.includes('BITCOIN_RPC_-5'))throw error;return {found:false,txid,source:'getmempoolentry'}}
}

export async function deriveFinalizedTransaction({finalized,rpc}){requireRpc(rpc);if(!finalized?.complete||!finalized?.hex)throw new Error('FINALIZED_TRANSACTION_REQUIRED');const decoded=await rpc('decoderawtransaction',[finalized.hex]);return {...decoded,txid:requireTxid(decoded?.txid)}}
export async function deriveFinalizedTxid({finalized,rpc}){return (await deriveFinalizedTransaction({finalized,rpc})).txid}
const seal=proof=>markBitcoinEvidenceVerified(proof)

export async function verifyBitcoinIncidentResolution({incident,payout,finalized=null,resolutionCode,replacementTxid=null,rpc}){
 requireRpc(rpc);if(!incident?.id||!payout?.id||incident.payoutId!==payout.id)throw new Error('INCIDENT_PAYOUT_MISMATCH');if(!Object.values(BITCOIN_RESOLUTION).includes(resolutionCode))throw new Error('BITCOIN_RESOLUTION_CODE_UNSUPPORTED')
 if(resolutionCode===BITCOIN_RESOLUTION.TX_CONFIRMED){const txid=requireTxid(payout.txid),wallet=await walletEvidence(txid,rpc);if(wallet.found&&wallet.confirmations>0&&wallet.blockhash)return seal({verified:true,resolutionCode,txid,evidence:{wallet},verifiedAt:now()});const raw=await rawTransactionEvidence(txid,rpc);if(!raw.found||raw.confirmations<1||!raw.blockhash)throw new Error('BITCOIN_EVIDENCE_TX_NOT_CONFIRMED');return seal({verified:true,resolutionCode,txid,evidence:{wallet,raw},verifiedAt:now()})}
 if(resolutionCode===BITCOIN_RESOLUTION.TX_NOT_BROADCAST){const txid=payout.txid?requireTxid(payout.txid):await deriveFinalizedTxid({finalized,rpc});const index=await txIndexState(rpc);if(!index.enabled||!index.synced)throw new Error('BITCOIN_TXINDEX_REQUIRED_FOR_ABSENCE_PROOF');const [wallet,raw,mempool]=await Promise.all([walletEvidence(txid,rpc),rawTransactionEvidence(txid,rpc),mempoolEvidence(txid,rpc)]);if(wallet.found||raw.found||mempool.found)throw new Error('BITCOIN_EVIDENCE_TRANSACTION_PRESENT');return seal({verified:true,resolutionCode,txid,evidence:{index,wallet,raw,mempool,derivedFromFinalized:!payout.txid},verifiedAt:now()})}
 const originalTxid=requireTxid(payout.txid),replacement=requireTxid(replacementTxid);if(originalTxid===replacement)throw new Error('BITCOIN_REPLACEMENT_TXID_MUST_DIFFER');const [originalWallet,originalRaw,originalMempool,replacementRaw,replacementMempool]=await Promise.all([walletEvidence(originalTxid,rpc),rawTransactionEvidence(originalTxid,rpc),mempoolEvidence(originalTxid,rpc),rawTransactionEvidence(replacement,rpc),mempoolEvidence(replacement,rpc)]);if(originalWallet.confirmations>0||originalRaw.confirmations>0)throw new Error('BITCOIN_EVIDENCE_ORIGINAL_ALREADY_CONFIRMED');if(!replacementRaw.found&&!replacementMempool.found)throw new Error('BITCOIN_EVIDENCE_REPLACEMENT_NOT_FOUND');let originalTx=originalRaw.found?originalRaw:null;if(!originalTx?.vin?.length&&finalized){const decoded=await deriveFinalizedTransaction({finalized,rpc});if(decoded.txid!==originalTxid)throw new Error('BITCOIN_FINALIZED_TXID_MISMATCH');originalTx=decoded}if(!originalTx?.vin?.length)throw new Error('BITCOIN_ORIGINAL_INPUTS_UNAVAILABLE');let replacementTx=replacementRaw;if(!replacementTx?.vin?.length){const raw=await rpc('getrawtransaction',[replacement,true]);replacementTx={...raw,vin:raw?.vin||[]}}const originalInputs=new Set(inputsOf(originalTx)),replacementInputs=inputsOf(replacementTx);const sharedInputs=replacementInputs.filter(v=>originalInputs.has(v));if(sharedInputs.length===0)throw new Error('BITCOIN_REPLACEMENT_INPUT_MISMATCH');return seal({verified:true,resolutionCode,txid:originalTxid,replacementTxid:replacement,evidence:{originalWallet,originalRaw,originalMempool,replacementRaw,replacementMempool,sharedInputs},verifiedAt:now()})
}
