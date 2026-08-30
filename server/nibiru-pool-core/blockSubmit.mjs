const now=()=>new Date().toISOString()

export async function submitBlockCandidate({blockHex,submission,rpc}={}){
  if(!submission?.verified||!submission?.blockCandidate) throw new Error('VERIFIED_BLOCK_CANDIDATE_REQUIRED')
  if(typeof blockHex!=='string'||blockHex.length<160||!/^[0-9a-f]+$/i.test(blockHex)) throw new Error('BLOCK_HEX_REQUIRED')
  if(typeof rpc!=='function') throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  const result=await rpc('submitblock',[blockHex])
  const accepted=result===null
  return Object.freeze({submissionId:submission.submissionId,jobId:submission.jobId,accepted,result:result??null,submittedAt:now(),bookableBtc:false})
}

export function confirmBlockOnChain({submissionId,blockHash,confirmations,height,rewardSats}={}){
  if(!submissionId) throw new Error('SUBMISSION_ID_REQUIRED')
  if(!/^[0-9a-f]{64}$/i.test(blockHash||'')) throw new Error('BLOCK_HASH_REQUIRED')
  if(!(Number(confirmations)>=1)) throw new Error('BLOCK_NOT_CONFIRMED')
  if(!Number.isInteger(Number(height))||Number(height)<0) throw new Error('INVALID_HEIGHT')
  if(!Number.isInteger(Number(rewardSats))||Number(rewardSats)<0) throw new Error('INVALID_REWARD_SATS')
  return Object.freeze({submissionId,blockHash,confirmations:Number(confirmations),height:Number(height),rewardSats:String(rewardSats),bookableBtc:true,confirmedAt:now()})
}
