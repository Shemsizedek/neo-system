import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'
import {compileNvm,digestPreimage} from '../neo-vm/nvm.mjs'
import {verifyBvmRegtest} from '../neo-vm/bvm-regtest.mjs'
import {restrictedBvmBitcoinRpc} from '../neo-vm/shared-bitcoin-core.mjs'

// Deliberately destructive ONLY inside the disposable Bitcoin Core regtest
// container. Never call this with a production RPC endpoint or credentials.
const url=process.env.BITCOIN_RPC_URL
const auth=process.env.BITCOIN_RPC_AUTH
if(url!=='http://127.0.0.1:18443'||
   auth!=='neo-regtest-ci:disposable-not-a-secret'){
  throw new Error('DISPOSABLE_CI_REGTEST_REQUIRED')
}
const rpc=bitcoinRpcClient({url,auth,timeoutMs:5000})
const readRpc=restrictedBvmBitcoinRpc(rpc)
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
let info
for(let retry=0;retry<40;retry++){
  try{info=await readRpc('getblockchaininfo',[]);break}
  catch(error){if(retry===39)throw error;await pause(500)}
}
assert.equal(info?.chain,'regtest','must be isolated regtest')

// This test contract uses no signing key. A sha256 hashlock alone is NOT safe
// as mainnet custody or a production smart contract.
const preimage=Buffer.from('neo-bvm-regtest-valid-preimage-v1','utf8')
const digest=digestPreimage(preimage)
const program={version:1,network:'bitcoin-regtest',contract:{kind:'sha256-preimage',digest}}
const plan=compileNvm(program)
const decodedScript=await rpc('decodescript',[plan.witnessScript])
assert.equal(decodedScript?.segwit?.hex,plan.scriptPubKey)
assert.match(decodedScript.segwit.address,/^bcrt1/)

await rpc('createwallet',['neo-bvm-script-acceptance'])
const walletRpc=bitcoinRpcClient({url:url+'/wallet/neo-bvm-script-acceptance',auth,timeoutMs:5000})
const mineAddress=await walletRpc('getnewaddress',[])
await rpc('generatetoaddress',[101,mineAddress])

// Only disposable regtest funding is broadcast to the isolated CI node.
const fundingTxid=await walletRpc('sendtoaddress',[decodedScript.segwit.address,0.002])
assert.match(fundingTxid,/^[0-9a-f]{64}$/)
await rpc('generatetoaddress',[1,mineAddress])

const funding=await walletRpc('gettransaction',[fundingTxid])
const fundingDecoded=await readRpc('decoderawtransaction',[funding.hex])
const output=fundingDecoded.vout.find(v=>v.scriptPubKey.hex===plan.scriptPubKey)
assert.ok(output,'regtest funding output must match compiled P2WSH script')
const vout=output.n
assert.ok(Number.isSafeInteger(vout)&&vout>=0)
const outpoint={txid:fundingTxid,vout}
const utxo=await readRpc('gettxout',[fundingTxid,vout,true])
assert.equal(utxo?.scriptPubKey?.hex,plan.scriptPubKey)

// Bitcoin Core supplies the destination's standard scriptPubKey; the NVM/BVM
// test itself never stores or uses signing credentials.
const destination=await walletRpc('getnewaddress',[])
const destinationInfo=await walletRpc('getaddressinfo',[destination])
const destScript=Buffer.from(destinationInfo.scriptPubKey,'hex')
assert.ok(destScript.length>0&&destScript.length<253)
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b}
const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(n);return b}
const shortData=b=>{assert.ok(b.length<253);return Buffer.concat([Buffer.from([b.length]),b])}
function spendWithWitness(value,{script=plan.witnessScript}={}){
 const prev=Buffer.from(fundingTxid,'hex').reverse()
 const witnessScript=Buffer.from(script,'hex')
 // v2 segwit transaction: one input, one wallet-address output, two witness items.
 // Funding: 200000 sats; output: 180000 sats; fee: 20000 sats.
 return Buffer.concat([
   u32(2),Buffer.from([0,1]),Buffer.from([1]),
   prev,u32(vout),Buffer.from([0]),u32(0xfffffffd),
   Buffer.from([1]),u64(180000n),shortData(destScript),
   Buffer.from([2]),shortData(value),shortData(witnessScript),u32(0)
 ]).toString('hex')
}
const good=await verifyBvmRegtest({
  rpc:readRpc,program,outpoint,rawTransactionHex:spendWithWitness(preimage)
})
assert.equal(good.prevoutVerified,true)
assert.equal(good.mempoolAccepted,true,'Bitcoin Core must accept the valid witness')
assert.equal(good.broadcast,false)

const wrongPreimage=await verifyBvmRegtest({
  rpc:readRpc,program,outpoint,rawTransactionHex:spendWithWitness(Buffer.from('incorrect-regtest-preimage'))
})
assert.equal(wrongPreimage.mempoolAccepted,false,'Bitcoin Core must reject wrong preimage')
assert.equal(wrongPreimage.broadcast,false)
assert.ok(wrongPreimage.rejectReason)
const changedScript=await verifyBvmRegtest({
  rpc:readRpc,program,outpoint,
  rawTransactionHex:spendWithWitness(preimage,{script:'51'})
})
assert.equal(changedScript.mempoolAccepted,false,'Bitcoin Core must reject wrong P2WSH witness script')
assert.equal(changedScript.broadcast,false)

const txoutStillPresent=await readRpc('gettxout',[fundingTxid,vout,true])
assert.ok(txoutStillPresent,'testmempoolaccept must not consume the funding output')
const txids=[fundingTxid]
process.stdout.write(JSON.stringify({
  gate:'neo-bvm-real-script-acceptance',
  chain:'regtest',
  fundingTxids:txids,
  acceptedValidWitness:true,
  rejectedWrongPreimage:true,
  rejectedWrongScript:true,
  actualSpendBroadcast:false,
  mainnetTouched:false
})+'\n')
