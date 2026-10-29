import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {compileNvm,digestPreimage} from './nvm.mjs'
import {verifyBvmRegtest} from './bvm-regtest.mjs'
const hash=v=>createHash('sha256').update(v).digest('hex')
const digest=hash('neo-regtest-secret')
const program={version:1,network:'bitcoin-regtest',contract:{kind:'sha256-preimage',digest}}
const outpoint={txid:'ab'.repeat(32),vout:0}
const rawTransactionHex='02000000000100'
const plan=compileNvm(program)
function fixture({chain='regtest',scriptPubKey=plan.scriptPubKey,vin=[outpoint],allowed=true}={}){
  const calls=[]
  const rpc=async(method,args)=>{
    calls.push({method,args})
    if(method==='getblockchaininfo')return {chain}
    if(method==='gettxout')return {scriptPubKey:{hex:scriptPubKey}}
    if(method==='decoderawtransaction')return {vin}
    if(method==='testmempoolaccept')return [{allowed,'reject-reason':allowed?undefined:'mandatory-script-verify-flag-failed'}]
    throw new Error('UNEXPECTED_RPC:'+method)
  }
  return {rpc,calls}
}
test('NVM compiles deterministic native Bitcoin P2WSH hashlock',()=>{
  assert.equal(plan.witnessScript,'a820'+digest+'87')
  assert.equal(plan.scriptPubKey,'0020'+hash(Buffer.from(plan.witnessScript,'hex')))
  assert.equal(plan.programId,hash(Buffer.from(plan.witnessScript,'hex')))
  assert.deepEqual(compileNvm(program),plan)
  assert.equal(digestPreimage(Buffer.from('neo-regtest-secret')),digest)
})
test('NVM rejects Ethereum/EVM, arbitrary fields, unsafe chain and invalid digest',()=>{
  for(const p of [
    {...program,network:'ethereum'},
    {...program,network:'bitcoin-mainnet'},
    {...program,evm:true},
    {...program,contract:{...program.contract,bytecode:'0x00'}},
    {...program,contract:{kind:'evm-call',digest}},
    {...program,contract:{kind:'sha256-preimage',digest:'zz'}}
  ])assert.throws(()=>compileNvm(p),/NVM_/)
  assert.throws(()=>digestPreimage(Buffer.alloc(521)),/NVM_PREIMAGE_LENGTH_INVALID/)
})
test('BVM accepts Bitcoin Core regtest policy evidence without signing or broadcast',async()=>{
  const {rpc,calls}=fixture()
  const result=await verifyBvmRegtest({rpc,program,outpoint,rawTransactionHex})
  assert.equal(result.mempoolAccepted,true)
  assert.equal(result.broadcast,false)
  assert.equal(result.prevoutVerified,true)
  assert.deepEqual(calls.map(c=>c.method),['getblockchaininfo','gettxout','decoderawtransaction','testmempoolaccept'])
})
test('BVM rejects mainnet, testnet, signet, Ethereum without further RPC calls',async()=>{
  for(const chain of ['main','test','signet','ethereum']){
    const {rpc,calls}=fixture({chain})
    await assert.rejects(()=>verifyBvmRegtest({rpc,program,outpoint,rawTransactionHex}),/BVM_REGTEST_REQUIRED/)
    assert.deepEqual(calls.map(c=>c.method),['getblockchaininfo'])
  }
})
test('BVM rejects wrong UTXO script and unrelated transaction inputs',async()=>{
  const wrong=fixture({scriptPubKey:'0014'+'ab'.repeat(20)})
  await assert.rejects(()=>verifyBvmRegtest({rpc:wrong.rpc,program,outpoint,rawTransactionHex}),/BVM_PREVOUT_SCRIPT_MISMATCH/)
  assert.equal(wrong.calls.some(c=>c.method==='testmempoolaccept'),false)
  const unrelated=fixture({vin:[{txid:'cd'.repeat(32),vout:1}]})
  await assert.rejects(()=>verifyBvmRegtest({rpc:unrelated.rpc,program,outpoint,rawTransactionHex}),/BVM_TRANSACTION_NOT_SPENDING_OUTPOINT/)
})
test('BVM reports rejected mempool transactions without broadcasting',async()=>{
  const {rpc}=fixture({allowed:false})
  const result=await verifyBvmRegtest({rpc,program,outpoint,rawTransactionHex})
  assert.equal(result.mempoolAccepted,false)
  assert.equal(result.rejectReason,'mandatory-script-verify-flag-failed')
  assert.equal(result.broadcast,false)
})
test('Invalid input fails closed before contacting Bitcoin Core',async()=>{
  const {rpc,calls}=fixture()
  for(const args of [
    {rpc,program:{...program,network:'ethereum'},outpoint,rawTransactionHex},
    {rpc,program,outpoint:{...outpoint,vout:-1},rawTransactionHex},
    {rpc,program,outpoint,rawTransactionHex:'0x1234'},
    {rpc,program,outpoint,rawTransactionHex:'aa'.repeat(1_000_001)}
  ])await assert.rejects(()=>verifyBvmRegtest(args),/NVM_|BVM_/)
  assert.equal(calls.length,0)
})
