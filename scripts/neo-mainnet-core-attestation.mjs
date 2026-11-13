import {bitcoinRpcClient} from '../server/miner-production/bitcoinWallet.mjs'
import {createRestrictedBvmBitcoinRpc} from '../server/neo-vm/shared-bitcoin-core.mjs'
import {attestBitcoinCounterpartyMainnet} from '../server/neo-vm/mainnet-attestation.mjs'

// Operator-only read preflight: run on a host with authorized local Bitcoin
// Core RPC or an authenticated SSH tunnel bound to loopback. Not a web API.
// Never provide a production RPC credential to the public staging web service.
async function main(){
  const url=process.env.BITCOIN_RPC_URL
  const auth=process.env.BITCOIN_RPC_AUTH
  if(typeof url!=='string'||typeof auth!=='string'||!url||!auth){
    throw new Error('MAINNET_CORE_RPC_ENV_REQUIRED')
  }
  const rpc=createRestrictedBvmBitcoinRpc({url,auth})
  const result=await attestBitcoinCounterpartyMainnet({bitcoinRpc:rpc})
  process.stdout.write(JSON.stringify(result,null,2)+'\n')
}
main().catch(error=>{
  // Expose only known finite error codes; never leak RPC paths, credentials,
  // responses or stack traces to stdout/stderr.
  const cause=String(error?.message||'')
  const code=/^(?:MAINNET_ATTESTATION_[A-Z_]+|COUNTERPARTY_[A-Z_]+|BVM_[A-Z_]+)$/.test(cause)?cause:'MAINNET_PREFLIGHT_UNAVAILABLE'
  process.stderr.write(code+'\n')
  process.exitCode=1
})
