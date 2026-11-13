import assert from 'node:assert/strict'
import http from 'node:http'
import {once} from 'node:events'
import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'
import {restrictedBvmBitcoinRpc,inspectBvmBitcoinCore} from '../neo-vm/shared-bitcoin-core.mjs'
import {createBitcoinGatewayHandler} from './bitcoin-gateway.mjs'

// This CI-only smoke test intentionally touches a disposable REGTEST wallet.
// It does not submit, sign, or broadcast a real Bitcoin transaction.
const url=process.env.BITCOIN_RPC_URL
const auth=process.env.BITCOIN_RPC_AUTH
if(url!=='http://127.0.0.1:18443'||auth!=='neo-regtest-ci:disposable-not-a-secret')throw new Error('DISPOSABLE_CI_REGTEST_REQUIRED')
const rpc=bitcoinRpcClient({url,auth,timeoutMs:3000})
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
let info
for(let n=0;n<45;n++){
  try {info=await rpc('getblockchaininfo',[]);break}
  catch(error){if(n===44)throw error;await sleep(1000)}
}
assert.equal(info?.chain,'regtest')
const securedRpc=restrictedBvmBitcoinRpc(rpc)
const initial=await inspectBvmBitcoinCore(securedRpc)
assert.equal(initial.compatibleWithBvmRegtest,true)
await assert.rejects(()=>securedRpc('sendrawtransaction',['00']),/BVM_RPC_METHOD_FORBIDDEN/)

// Seed an isolated, disposable regtest chain. Never do this on the NEO mainnet node.
await rpc('createwallet',['neo-bvm-ci'])
const walletRpc=bitcoinRpcClient({url:url+'/wallet/neo-bvm-ci',auth,timeoutMs:3000})
const address=await walletRpc('getnewaddress',[])
const blocks=await rpc('generatetoaddress',[101,address])
assert.equal(blocks.length,101)
const after=await rpc('getblockchaininfo',[])
assert.equal(after.chain,'regtest')
assert.equal(after.initialblockdownload,false)
assert.ok(after.blocks>=101)

const gateway=createBitcoinGatewayHandler({
  enabled:true,
  rpc:securedRpc,
  subjectResolver:req=>req.headers.authorization==='Bearer disposable-ci-token'?'ci-operator':null,
  authService:{session:async()=>({role:'executive-admin',neopassStatus:'active'})},
  allowedProjects:['neo-counter'],
  expectedChain:'regtest'
})
const server=http.createServer(async(req,res)=>{
  const handled=await gateway(req,res,new URL(req.url||'/','http://127.0.0.1'))
  if(!handled){res.writeHead(404);res.end()}
})
server.listen(0,'127.0.0.1')
await once(server,'listening')
try{
  const root='http://127.0.0.1:'+server.address().port
  const path='/api/v1/bitcoin/chain?scope=apps&project=neo-counter'
  const unauthorized=await fetch(root+path)
  assert.equal(unauthorized.status,401)
  const blocked=await fetch(root+'/api/v1/bitcoin/chain?scope=apps&project=gisd',{
    headers:{authorization:'Bearer disposable-ci-token'}
  })
  assert.equal(blocked.status,403)
  const response=await fetch(root+path,{headers:{authorization:'Bearer disposable-ci-token'}})
  assert.equal(response.status,200)
  const data=await response.json()
  assert.equal(data.node.implementation,'Bitcoin Core')
  assert.equal(data.node.chain,'regtest')
  assert.ok(data.node.blocks>=101)
  assert.equal(data.readOnly,true)
  assert.equal(data.signingEnabled,false)
  assert.equal(data.broadcastingEnabled,false)
  process.stdout.write(JSON.stringify({ok:true,chain:data.node.chain,blocks:data.node.blocks,readOnly:true,source:'live-disposable-bitcoind-regtest'})+'\n')
}finally{
  server.close()
  await once(server,'close')
}
