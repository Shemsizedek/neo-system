import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const n=v=>Number(v||0)

export function bitcoinRpcClient({url,auth,fetchImpl=fetch,timeoutMs=10000}){
  if(!url) throw new Error('BITCOIN_RPC_URL_REQUIRED')
  if(!auth) throw new Error('BITCOIN_RPC_AUTH_REQUIRED')
  return async(method,params=[])=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs)
    try{
      const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json','authorization':`Basic ${Buffer.from(auth).toString('base64')}`},body:JSON.stringify({jsonrpc:'2.0',id:crypto.randomUUID(),method,params}),signal:controller.signal})
      if(!response.ok) throw new Error(`BITCOIN_RPC_HTTP_${response.status}`)
      const body=await response.json()
      if(body.error) throw new Error(`BITCOIN_RPC_${body.error.code}:${body.error.message}`)
      return body.result
    }finally{clearTimeout(timer)}
  }
}

export async function createPayoutPsbt({request,feeRateSatVb=5,rpc}){
  if(request?.state!=='APPROVED') throw new Error('APPROVED_PAYOUT_REQUIRED')
  if(typeof rpc!=='function') throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  if(n(feeRateSatVb)<=0) throw new Error('INVALID_FEE_RATE')
  const outputs={[request.address]:n(request.amountBtc)}
  const result=await rpc('walletcreatefundedpsbt',[[],outputs,0,{lockUnspents:true,replaceable:true,fee_rate:n(feeRateSatVb)},true])
  if(!result?.psbt) throw new Error('PSBT_CREATION_FAILED')
  return {psbtId:`PSBT-${crypto.randomUUID()}`,payoutId:request.id,psbt:result.psbt,feeBtc:n(result.fee),changePosition:Number.isInteger(result.changepos)?result.changepos:null,feeRateSatVb:n(feeRateSatVb),signingMode:'EXTERNAL_SIGNER',privateKeyIncluded:false,createdAt:now()}
}

export function exportSignerEnvelope(psbtRecord){
  if(!psbtRecord?.psbt||!psbtRecord?.payoutId) throw new Error('PSBT_REQUIRED')
  return {protocol:'BIP174',payoutId:psbtRecord.payoutId,psbtId:psbtRecord.psbtId,psbt:psbtRecord.psbt,signingMode:'EXTERNAL_SIGNER',privateKeyIncluded:false,exportedAt:now()}
}

export async function finalizeSignedPsbt({psbtRecord,signedPsbt,rpc}){
  if(!psbtRecord?.psbtId) throw new Error('PSBT_RECORD_REQUIRED')
  if(typeof signedPsbt!=='string'||signedPsbt.length<20) throw new Error('SIGNED_PSBT_REQUIRED')
  if(typeof rpc!=='function') throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  const result=await rpc('finalizepsbt',[signedPsbt,true])
  if(result?.complete!==true||!result?.hex) throw new Error('PSBT_NOT_FULLY_SIGNED')
  return {psbtId:psbtRecord.psbtId,payoutId:psbtRecord.payoutId,hex:result.hex,complete:true,privateKeyIncluded:false,finalizedAt:now()}
}

export async function broadcastFinalizedTransaction({finalized,rpc}){
  if(!finalized?.complete||!finalized?.hex) throw new Error('FINALIZED_TRANSACTION_REQUIRED')
  if(typeof rpc!=='function') throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  const txid=await rpc('sendrawtransaction',[finalized.hex])
  if(!/^[0-9a-f]{64}$/i.test(txid||'')) throw new Error('BITCOIN_BROADCAST_TXID_INVALID')
  return {payoutId:finalized.payoutId,psbtId:finalized.psbtId,txid,broadcastAt:now()}
}

export async function transactionStatus({txid,rpc}){
  if(!/^[0-9a-f]{64}$/i.test(txid||'')) throw new Error('INVALID_BITCOIN_TXID')
  if(typeof rpc!=='function') throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  const result=await rpc('gettransaction',[txid,true,true])
  return {txid,confirmations:Math.max(0,n(result?.confirmations)),trusted:result?.trusted===true,abandoned:result?.abandoned===true,blockhash:result?.blockhash||null,checkedAt:now()}
}
