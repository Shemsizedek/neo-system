const now=()=>new Date().toISOString()
const txidPattern=/^[0-9a-f]{64}$/i

export const BITCOIN_RESOLUTION={TX_CONFIRMED:'TX_CONFIRMED',TX_NOT_BROADCAST:'TX_NOT_BROADCAST',TX_REPLACED:'TX_REPLACED'}

const rpcErrorCode=error=>String(error?.message||error||'')
const requireRpc=rpc=>{if(typeof rpc!=='function')throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')}
const requireTxid=txid=>{if(!txidPattern.test(String(txid||'')))throw new Error('INVALID_BITCOIN_TXID');return String(txid).toLowerCase()}

async function chainEvidence(txid,rpc){
  requireRpc(rpc);txid=requireTxid(txid)
  try{
    const tx=await rpc('getrawtransaction',[txid,true])
    return {found:true,txid,confirmations:Math.max(0,Number(tx?.confirmations||0)),blockhash:tx?.blockhash||null,inChain:Boolean(tx?.blockhash),source:'getrawtransaction'}
  }catch(error){
    const code=rpcErrorCode(error)
    if(!code.includes('No such mempool or blockchain transaction')&&!code.includes('BITCOIN_RPC_-5'))throw error
    return {found:false,txid,confirmations:0,blockhash:null,inChain:false,source:'getrawtransaction'}
  }
}

async function mempoolEvidence(txid,rpc){
  requireRpc(rpc);txid=requireTxid(txid)
  try{const entry=await rpc('getmempoolentry',[txid]);return {found:true,txid,vsize:Number(entry?.vsize||0),source:'getmempoolentry'}}
  catch(error){const code=rpcErrorCode(error);if(!code.includes('Transaction not in mempool')&&!code.includes('BITCOIN_RPC_-5'))throw error;return {found:false,txid,source:'getmempoolentry'}}
}

export async function deriveFinalizedTxid({finalized,rpc}){
  requireRpc(rpc)
  if(!finalized?.complete||!finalized?.hex)throw new Error('FINALIZED_TRANSACTION_REQUIRED')
  const decoded=await rpc('decoderawtransaction',[finalized.hex])
  return requireTxid(decoded?.txid)
}

export async function verifyBitcoinIncidentResolution({incident,payout,finalized=null,resolutionCode,replacementTxid=null,rpc}){
  requireRpc(rpc)
  if(!incident?.id||!payout?.id||incident.payoutId!==payout.id)throw new Error('INCIDENT_PAYOUT_MISMATCH')
  if(!Object.values(BITCOIN_RESOLUTION).includes(resolutionCode))throw new Error('BITCOIN_RESOLUTION_CODE_UNSUPPORTED')

  if(resolutionCode===BITCOIN_RESOLUTION.TX_CONFIRMED){
    const txid=requireTxid(payout.txid)
    const chain=await chainEvidence(txid,rpc)
    if(!chain.found||chain.confirmations<1||!chain.blockhash)throw new Error('BITCOIN_EVIDENCE_TX_NOT_CONFIRMED')
    return {verified:true,resolutionCode,txid,evidence:{chain},verifiedAt:now()}
  }

  if(resolutionCode===BITCOIN_RESOLUTION.TX_NOT_BROADCAST){
    const txid=payout.txid?requireTxid(payout.txid):await deriveFinalizedTxid({finalized,rpc})
    const [chain,mempool]=await Promise.all([chainEvidence(txid,rpc),mempoolEvidence(txid,rpc)])
    if(chain.found||mempool.found)throw new Error('BITCOIN_EVIDENCE_TRANSACTION_PRESENT')
    return {verified:true,resolutionCode,txid,evidence:{chain,mempool,derivedFromFinalized:!payout.txid},verifiedAt:now()}
  }

  const originalTxid=requireTxid(payout.txid)
  const replacement=requireTxid(replacementTxid)
  if(originalTxid===replacement)throw new Error('BITCOIN_REPLACEMENT_TXID_MUST_DIFFER')
  const [originalChain,originalMempool,replacementChain,replacementMempool]=await Promise.all([
    chainEvidence(originalTxid,rpc),mempoolEvidence(originalTxid,rpc),chainEvidence(replacement,rpc),mempoolEvidence(replacement,rpc)
  ])
  if(replacementChain.found!==true&&replacementMempool.found!==true)throw new Error('BITCOIN_EVIDENCE_REPLACEMENT_NOT_FOUND')
  if(originalChain.confirmations>0)throw new Error('BITCOIN_EVIDENCE_ORIGINAL_ALREADY_CONFIRMED')
  return {verified:true,resolutionCode,txid:originalTxid,replacementTxid:replacement,evidence:{originalChain,originalMempool,replacementChain,replacementMempool},verifiedAt:now()}
}
