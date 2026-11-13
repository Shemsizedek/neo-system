import {compileNvm} from './nvm.mjs'
import {evaluateP2wsh} from '../../core/neo-bvm/runtime.mjs'

const TXID=/^[0-9a-f]{64}$/i
const RAW_TX=/^(?:[0-9a-f]{2})+$/i
const MAX_FEE_SATS=100_000n
const MAX_WEIGHT=400_000

function sats(value){
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>21_000_000||Number(value.toFixed(8))!==value){
    throw new Error('BVM_AMOUNT_INVALID')
  }
  return BigInt(value.toFixed(8).replace('.',''))
}

// BVM v0: Bitcoin Core is the sole source of chain and mempool policy evaluation.
// All operations are read-only. There is no signing, transaction creation, or broadcast.
export async function verifyBvmRegtest({rpc,program,outpoint,rawTransactionHex}={}){
  if(typeof rpc!=='function')throw new Error('BVM_BITCOIN_RPC_REQUIRED')
  const plan=compileNvm(program) // fail closed before any external request
  if(!outpoint||typeof outpoint!=='object'||Array.isArray(outpoint)||
    Object.getPrototypeOf(outpoint)!==Object.prototype||
    Reflect.ownKeys(outpoint).length!==2||!Object.hasOwn(outpoint,'txid')||!Object.hasOwn(outpoint,'vout')||
    typeof outpoint.txid!=='string'||!TXID.test(outpoint.txid)||
    !Number.isSafeInteger(outpoint.vout)||outpoint.vout<0||outpoint.vout>0xffffffff){
    throw new Error('BVM_OUTPOINT_INVALID')
  }
  if(typeof rawTransactionHex!=='string'||rawTransactionHex.length>2_000_000||
    !RAW_TX.test(rawTransactionHex))throw new Error('BVM_RAW_TRANSACTION_INVALID')

  const chain=await rpc('getblockchaininfo',[])
  if(chain?.chain!=='regtest')throw new Error('BVM_REGTEST_REQUIRED')
  const utxo=await rpc('gettxout',[outpoint.txid,outpoint.vout,true])
  if(!utxo||String(utxo.scriptPubKey?.hex||'').toLowerCase()!==plan.scriptPubKey){
    throw new Error('BVM_PREVOUT_SCRIPT_MISMATCH')
  }
  const decoded=await rpc('decoderawtransaction',[rawTransactionHex])
  if(!Array.isArray(decoded?.vin)||decoded.vin.length!==1||!
    decoded.vin.some(v=>typeof v.txid==='string'&&v.txid.toLowerCase()===outpoint.txid.toLowerCase()&&v.vout===outpoint.vout)){
    throw new Error('BVM_TRANSACTION_NOT_SPENDING_OUTPOINT')
  }
  const input=decoded.vin[0]
  if(input.scriptSig?.hex!==''||!Array.isArray(input.txinwitness)||input.txinwitness.length!==2||
    typeof input.txinwitness[1]!=='string'||input.txinwitness[1].toLowerCase()!==plan.witnessScript){
    throw new Error('BVM_WITNESS_BINDING_INVALID')
  }
  const local=evaluateP2wsh({network:'regtest',scriptPubKeyHex:plan.scriptPubKey,witnessHex:input.txinwitness})
  if(!TXID.test(decoded.txid||'')||!TXID.test(decoded.hash||'')||
    !Number.isSafeInteger(decoded.weight)||decoded.weight<1||decoded.weight>MAX_WEIGHT||
    !Number.isSafeInteger(decoded.vsize)||decoded.vsize!==Math.ceil(decoded.weight/4)){
    throw new Error('BVM_TRANSACTION_CONTEXT_INVALID')
  }
  if(!Array.isArray(decoded.vout)||!decoded.vout.length)throw new Error('BVM_OUTPUTS_INVALID')
  const feeSats=sats(utxo.value)-decoded.vout.reduce((total,output)=>total+sats(output.value),0n)
  if(feeSats<0n||feeSats>MAX_FEE_SATS)throw new Error('BVM_FEE_OUT_OF_BOUNDS')
  const policy=await rpc('testmempoolaccept',[[rawTransactionHex]])
  if(!Array.isArray(policy)||policy.length!==1||typeof policy[0]?.allowed!=='boolean'){
    throw new Error('BVM_MEMPOOL_RESPONSE_INVALID')
  }
  if(typeof policy[0].txid!=='string'||policy[0].txid.toLowerCase()!==decoded.txid.toLowerCase()||
    typeof policy[0].wtxid!=='string'||policy[0].wtxid.toLowerCase()!==decoded.hash.toLowerCase()){
    throw new Error('BVM_MEMPOOL_TRANSACTION_MISMATCH')
  }
  if(policy[0].allowed&&local.status!=='LOCAL_ACCEPT')throw new Error('BVM_EVALUATION_DISAGREEMENT')
  return Object.freeze({
    network:'bitcoin-regtest',
    programId:plan.programId,
    prevoutVerified:true,
    witnessBound:true,
    localScriptAccepted:local.status==='LOCAL_ACCEPT',
    feeSats:Number(feeSats),
    weight:decoded.weight,
    txid:decoded.txid.toLowerCase(),
    wtxid:decoded.hash.toLowerCase(),
    mempoolAccepted:policy[0].allowed,
    rejectReason:policy[0].allowed?null:String(policy[0]['reject-reason']||'rejected'),
    broadcast:false
  })
}
