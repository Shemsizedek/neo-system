import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'
import {createGenesisPoolRuntime} from './genesisRuntime.mjs'
import {confirmBlockOnChain} from './blockSubmit.mjs'

const DEFAULT_TEST_DIFFICULTY='0.0000000001'

function requireRegtest(chain){
  if(chain!=='regtest')throw new Error(`REGTEST_REQUIRED:${chain||'unknown'}`)
}

export async function runRegtestPoolSolve({
  rpc,
  payoutScriptHex,
  maxNonce=1_000_000,
  extranonce1='01020304',
  extranonce2='00000000'
}={}){
  if(typeof rpc!=='function')throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  if(!/^[0-9a-f]+$/i.test(payoutScriptHex||''))throw new Error('PAYOUT_SCRIPT_REQUIRED')
  if(!Number.isSafeInteger(Number(maxNonce))||Number(maxNonce)<0)throw new Error('INVALID_MAX_NONCE')

  const chain=await rpc('getblockchaininfo',[])
  requireRegtest(chain?.chain)

  const runtime=createGenesisPoolRuntime({
    rpc,
    payoutScriptHex,
    poolId:'world-mint-regtest-solve',
    initialDifficulty:DEFAULT_TEST_DIFFICULTY
  })
  const job=await runtime.refreshTemplate()
  const ntime=Math.max(Number(job.template.curtime),Number(job.template.mintime)).toString(16).padStart(8,'0')

  let solution=null
  for(let value=0;value<=Number(maxNonce);value++){
    const nonce=value.toString(16).padStart(8,'0')
    const candidate=runtime.verifyWorkerSolution({extranonce1,extranonce2,ntime,nonce})
    if(candidate.submission.blockCandidate){solution=candidate;break}
  }
  if(!solution)throw new Error('REGTEST_NETWORK_TARGET_NOT_FOUND')

  const submitted=await runtime.submitIfBlockCandidate(solution)
  if(!submitted.accepted)throw new Error(`REGTEST_SUBMITBLOCK_REJECTED:${submitted.result||'unknown'}`)

  const header=await rpc('getblockheader',[solution.submission.hash,true])
  if(!header||Number(header.confirmations||0)<1)throw new Error('REGTEST_BLOCK_NOT_CONFIRMED')

  const confirmed=confirmBlockOnChain({
    submissionId:solution.submission.submissionId,
    blockHash:solution.submission.hash,
    confirmations:Number(header.confirmations),
    height:Number(job.template.height),
    rewardSats:Number(job.template.coinbaseValueSats)
  })

  return Object.freeze({
    ok:true,
    chain:'regtest',
    poolId:runtime.poolId,
    templateId:job.template.templateId,
    height:Number(job.template.height),
    blockHash:solution.submission.hash,
    nonce:solution.submission.nonce,
    extranonce1,
    extranonce2,
    submitAccepted:submitted.accepted,
    confirmations:confirmed.confirmations,
    rewardSats:confirmed.rewardSats,
    bookableTestBtc:confirmed.bookableBtc
  })
}

function arg(name){
  const prefix=`--${name}=`
  return process.argv.find(value=>value.startsWith(prefix))?.slice(prefix.length)||null
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const url=process.env.BITCOIN_RPC_URL
    const auth=process.env.BITCOIN_RPC_AUTH
    const payoutScriptHex=process.env.WORLD_MINT_PAYOUT_SCRIPT_HEX
    if(!url||!auth)throw new Error('BITCOIN_RPC_URL_AND_AUTH_REQUIRED')
    if(!payoutScriptHex)throw new Error('WORLD_MINT_PAYOUT_SCRIPT_HEX_REQUIRED')
    const rpc=bitcoinRpcClient({url,auth})
    const maxNonce=Number(arg('max-nonce')||1_000_000)
    const result=await runRegtestPoolSolve({rpc,payoutScriptHex,maxNonce})
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`)
  }catch(error){
    process.stderr.write(`[regtest-pool-solve] ${String(error?.message||error)}\n`)
    process.exitCode=1
  }
}
