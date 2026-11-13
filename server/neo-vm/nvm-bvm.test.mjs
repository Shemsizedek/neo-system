import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {compileNvm,digestPreimage} from './nvm.mjs'
import {verifyBvmRegtest} from './bvm-regtest.mjs'
import {compileNvmContract} from '../../core/neo-nvm/runtime.mjs'
const hash=v=>createHash('sha256').update(v).digest('hex')
const digest=hash('neo-regtest-secret')
const program={version:1,network:'bitcoin-regtest',contract:{kind:'sha256-preimage',digest}}
const outpoint={txid:'ab'.repeat(32),vout:0}
const rawTransactionHex='02000000000100'
const plan=compileNvm(program)
const txid='11'.repeat(32)
const wtxid='22'.repeat(32)
const witness=[Buffer.from('neo-regtest-secret').toString('hex'),plan.witnessScript]
const input={...outpoint,scriptSig:{hex:''},txinwitness:witness}
function fixture({chain='regtest',scriptPubKey=plan.scriptPubKey,vin=[input],allowed=true,decoded={},policy={}}={}){
  const calls=[]
  const rpc=async(method,args)=>{
    calls.push({method,args})
    if(method==='getblockchaininfo')return {chain}
    if(method==='gettxout')return {value:1,scriptPubKey:{hex:scriptPubKey}}
    if(method==='decoderawtransaction')return {vin,txid,hash:wtxid,weight:400,vsize:100,vout:[{value:0.9999}],...decoded}
    if(method==='testmempoolaccept')return [{txid,wtxid,allowed,'reject-reason':allowed?undefined:'mandatory-script-verify-flag-failed',...policy}]
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
  assert.equal(result.witnessBound,true)
  assert.equal(result.localScriptAccepted,true)
  assert.equal(result.feeSats,10000)
  assert.deepEqual(calls.map(c=>c.method),['getblockchaininfo','gettxout','decoderawtransaction','testmempoolaccept'])
})
test('both NVM formats share the same fixed-length Script compiler',()=>{
  const strict=compileNvm({...program,contract:{kind:'sha256-preimage-32',digest}})
  const core=compileNvmContract({schemaVersion:1,family:'bitcoin',network:'regtest',kind:'sha256-preimage-32-v1',digestHex:digest})
  assert.equal(strict.witnessScript,core.witnessScriptHex)
  assert.equal(strict.scriptPubKey,core.scriptPubKeyHex)
})
test('BVM binds exactly one native witness input to the compiled contract',async()=>{
  for(const vin of [
    [input,input],
    [{...input,scriptSig:{hex:'00'}}],
    [{...input,txinwitness:[witness[0],'51']}],
    [{...input,txinwitness:[witness[0],'01',plan.witnessScript]}],
    [{...input,txinwitness:undefined}]
  ]){
    const {rpc,calls}=fixture({vin})
    await assert.rejects(()=>verifyBvmRegtest({rpc,program,outpoint,rawTransactionHex}),/BVM_TRANSACTION_NOT_SPENDING_OUTPOINT|BVM_WITNESS_BINDING_INVALID/)
    assert.equal(calls.some(c=>c.method==='testmempoolaccept'),false)
  }
})
test('BVM rejects invalid amount, fee and weight contexts before mempool evaluation',async()=>{
  for(const decoded of [
    {vout:[]},{vout:[{value:-1}]},{vout:[{value:1.1}]},{vout:[{value:0.5}]},
    {vout:[{value:0.999999999}]},{weight:400001,vsize:100001},
    {weight:400,vsize:99},{txid:'invalid'}
  ]){
    const {rpc,calls}=fixture({decoded})
    await assert.rejects(()=>verifyBvmRegtest({rpc,program,outpoint,rawTransactionHex}),/BVM_/)
    assert.equal(calls.some(c=>c.method==='testmempoolaccept'),false)
  }
})
test('Core policy evidence must identify the exact decoded transaction and witness',async()=>{
  for(const policy of [{txid:'33'.repeat(32)},{wtxid:'44'.repeat(32)},{txid:undefined},{allowed:undefined}]){
    const {rpc}=fixture({policy})
    await assert.rejects(()=>verifyBvmRegtest({rpc,program,outpoint,rawTransactionHex}),/BVM_MEMPOOL_/)
  }
})
test('Core cannot mark a locally failed hashlock as accepted',async()=>{
  const {rpc}=fixture({vin:[{...input,txinwitness:['00'.repeat(32),plan.witnessScript]}]})
  await assert.rejects(()=>verifyBvmRegtest({rpc,program,outpoint,rawTransactionHex}),/BVM_EVALUATION_DISAGREEMENT/)
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
