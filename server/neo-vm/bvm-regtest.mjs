import {compileNvm} from './nvm.mjs'

const TXID=/^[0-9a-f]{64}$/i
const RAW_TX=/^(?:[0-9a-f]{2})+$/i

// BVM v0: Bitcoin Core is the sole source of chain and mempool policy evaluation.
// All operations are read-only. There is no signing, transaction creation, or broadcast.
export async function verifyBvmRegtest({rpc,program,outpoint,rawTransactionHex}={}){
  if(typeof rpc!=='function')throw new Error('BVM_BITCOIN_RPC_REQUIRED')
  const plan=compileNvm(program) // fail closed before any external request
  if(!outpoint||typeof outpoint!=='object'||Array.isArray(outpoint)||
    Object.getPrototypeOf(outpoint)!==Object.prototype||
    Object.keys(outpoint).sort().join(',')!=='txid,vout' ||
    typeof outpoint.txid!=='string'||!TXID.test(outpoint.txid)||
    !Number.isSafeInteger(outpoint.vout)||outpoint.vout<0||outpoint.vout>0xffffffff){
    throw new Error('BVM_OUTPOINT_INVALID')
  }
  if(typeof rawTransactionHex!=='string'||!RAW_TX.test(rawTransactionHex)||
    rawTransactionHex.length>2_000_000)throw new Error('BVM_RAW_TRANSACTION_INVALID')

  const chain=await rpc('getblockchaininfo',[])
  if(chain?.chain!=='regtest')throw new Error('BVM_REGTEST_REQUIRED')
  const utxo=await rpc('gettxout',[outpoint.txid,outpoint.vout,true])
  if(!utxo||String(utxo.scriptPubKey?.hex||'').toLowerCase()!==plan.scriptPubKey){
    throw new Error('BVM_PREVOUT_SCRIPT_MISMATCH')
  }
  const decoded=await rpc('decoderawtransaction',[rawTransactionHex])
  if(!Array.isArray(decoded?.vin)||!decoded.vin.some(v=>
    typeof v.txid==='string'&&v.txid.toLowerCase()===outpoint.txid.toLowerCase()&&v.vout===outpoint.vout)){
    throw new Error('BVM_TRANSACTION_NOT_SPENDING_OUTPOINT')
  }
  const policy=await rpc('testmempoolaccept',[[rawTransactionHex]])
  if(!Array.isArray(policy)||policy.length!==1||typeof policy[0]?.allowed!=='boolean'){
    throw new Error('BVM_MEMPOOL_RESPONSE_INVALID')
  }
  return Object.freeze({
    network:'bitcoin-regtest',
    programId:plan.programId,
    prevoutVerified:true,
    mempoolAccepted:policy[0].allowed,
    rejectReason:policy[0].allowed?null:String(policy[0]['reject-reason']||'rejected'),
    broadcast:false
  })
}
