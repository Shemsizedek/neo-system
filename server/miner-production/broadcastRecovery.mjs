import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const txidRe=/^[0-9a-f]{64}$/i

export function deterministicTxid(rawHex){
  if(typeof rawHex!=='string'||rawHex.length<20||rawHex.length%2!==0||!/^[0-9a-f]+$/i.test(rawHex))throw new Error('VALID_RAW_BITCOIN_TRANSACTION_REQUIRED')
  const raw=Buffer.from(rawHex,'hex')
  const first=crypto.createHash('sha256').update(raw).digest()
  return Buffer.from(crypto.createHash('sha256').update(first).digest()).reverse().toString('hex')
}

export function createBroadcastIntent({finalized}){
  if(!finalized?.complete||!finalized?.hex||!finalized?.payoutId||!finalized?.psbtId)throw new Error('FINALIZED_TRANSACTION_REQUIRED')
  const txid=deterministicTxid(finalized.hex)
  return {id:`BCAST-${finalized.payoutId}`,payoutId:finalized.payoutId,psbtId:finalized.psbtId,txid,rawHex:finalized.hex,state:'PREPARED',preparedAt:now(),broadcastAt:null,recoveredAt:null}
}

export async function locatePreparedTransaction({intent,rpc}){
  if(!intent||!txidRe.test(intent.txid||''))throw new Error('BROADCAST_INTENT_REQUIRED')
  if(typeof rpc!=='function')throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  try{
    const mempool=await rpc('getmempoolentry',[intent.txid])
    if(mempool)return {found:true,location:'MEMPOOL',txid:intent.txid,checkedAt:now()}
  }catch{}
  try{
    const raw=await rpc('getrawtransaction',[intent.txid,true])
    if(raw?.txid===intent.txid)return {found:true,location:raw.confirmations>0?'CHAIN':'NODE',confirmations:Number(raw.confirmations||0),txid:intent.txid,checkedAt:now()}
  }catch{}
  return {found:false,location:null,txid:intent.txid,checkedAt:now()}
}

export async function executeBroadcastIntent({intent,rpc}){
  if(!intent?.rawHex||!txidRe.test(intent.txid||''))throw new Error('BROADCAST_INTENT_REQUIRED')
  if(deterministicTxid(intent.rawHex)!==intent.txid)throw new Error('BROADCAST_INTENT_TXID_MISMATCH')
  const existing=await locatePreparedTransaction({intent,rpc})
  if(existing.found)return {...intent,state:'BROADCAST',broadcastAt:intent.broadcastAt||now(),recoveredAt:now(),recoveryLocation:existing.location}
  const returned=await rpc('sendrawtransaction',[intent.rawHex])
  if(!txidRe.test(returned||''))throw new Error('BITCOIN_BROADCAST_TXID_INVALID')
  if(returned.toLowerCase()!==intent.txid.toLowerCase())throw new Error('BITCOIN_BROADCAST_TXID_MISMATCH')
  return {...intent,state:'BROADCAST',broadcastAt:now()}
}

export async function recoverPreparedBroadcasts({intents,rpc}){
  const results=[]
  for(const intent of intents||[]){
    if(intent.state!=='PREPARED')continue
    const located=await locatePreparedTransaction({intent,rpc})
    results.push({intent,located})
  }
  return results
}
