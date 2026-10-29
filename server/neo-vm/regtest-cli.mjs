import {readFile} from 'node:fs/promises'
import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'
import {verifyBvmRegtest} from './bvm-regtest.mjs'

// Run inside the neo-system checkout, with isolated Bitcoin Core regtest RPC.
// Never accept an untrusted RPC endpoint, credentials or remote address.
async function main(){
  const url=process.env.BITCOIN_RPC_URL
  const auth=process.env.BITCOIN_RPC_AUTH
  if(!url||!auth)throw new Error('BITCOIN_RPC_URL_AND_AUTH_REQUIRED')
  const endpoint=new URL(url)
  if(endpoint.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname)||
     endpoint.username||endpoint.password)throw new Error('BVM_LOOPBACK_RPC_REQUIRED')
  const input=process.argv[2]
  if(!input)throw new Error('BVM_FIXTURE_JSON_REQUIRED')
  const data=JSON.parse(await readFile(input,'utf8'))
  const result=await verifyBvmRegtest({...data,rpc:bitcoinRpcClient({url,auth})})
  process.stdout.write(JSON.stringify(result,null,2)+'\n')
  if(!result.mempoolAccepted)process.exitCode=2
}
main().catch(error=>{
  process.stderr.write('[neo-bvm-regtest] '+String(error?.message||error)+'\n')
  process.exitCode=1
})
