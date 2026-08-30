import crypto from 'node:crypto'
import {templateAdapter} from './bitcoinTemplate.mjs'
import {buildCoinbase,merkleBranchForCoinbase,applyMerkleBranch,serializeHeader,serializeBlock,dsha256} from './blockPrimitives.mjs'
import {createDifficultyState,difficultyMessage,targetFromDifficulty,recordAcceptedShare} from './difficultyController.mjs'
import {targetFromCompactBits} from './protocolMath.mjs'
import {submitBlockCandidate} from './blockSubmit.mjs'

const now=()=>new Date().toISOString()
const reverseHex=h=>Buffer.from(h,'hex').reverse().toString('hex')

export function createGenesisPoolRuntime({rpc,payoutScriptHex,poolId='world-mint-genesis',tag='/NEO-World-Mint/',initialDifficulty=1024}={}){
  if(typeof rpc!=='function')throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  if(!/^[0-9a-f]+$/i.test(payoutScriptHex||''))throw new Error('PAYOUT_SCRIPT_REQUIRED')
  const getTemplate=templateAdapter({rpc})
  let current=null
  let difficultyState=createDifficultyState({difficulty:initialDifficulty})

  async function refreshTemplate(){
    const template=await getTemplate()
    const extranonce1=crypto.randomBytes(4).toString('hex')
    const extranonce2Size=4
    current=Object.freeze({runtimeJobId:`wm_${crypto.randomUUID()}`,poolId,template,extranonce1,extranonce2Size,createdAt:now()})
    return current
  }

  function requireJob(){if(!current)throw new Error('GENESIS_JOB_NOT_READY');return current}

  function buildWorkerCoinbase({extranonce2='00000000'}={}){
    const job=requireJob()
    if(!/^[0-9a-f]+$/i.test(extranonce2)||extranonce2.length!==job.extranonce2Size*2)throw new Error('INVALID_EXTRANONCE2')
    return buildCoinbase({
      height:job.template.height,
      valueSats:job.template.coinbaseValueSats,
      payoutScriptHex,
      extranonce1Hex:job.extranonce1,
      extranonce2Hex:extranonce2,
      extranonce2Size:job.extranonce2Size,
      tag,
      witnessCommitmentHex:job.template.defaultWitnessCommitment
    })
  }

  function notifyMessage(){
    const job=requireJob()
    const coinbase=buildWorkerCoinbase({extranonce2:'00'.repeat(job.extranonce2Size)})
    const branch=merkleBranchForCoinbase(job.template.transactions.map(tx=>tx.txid))
    return Object.freeze({
      id:null,
      method:'mining.notify',
      params:[job.runtimeJobId,job.template.previousBlockHash,coinbase.coinbase1Hex,coinbase.coinbase2Hex,branch,job.template.version.toString(16).padStart(8,'0'),job.template.bits,job.template.curtime.toString(16).padStart(8,'0'),true],
      metadata:{templateId:job.template.templateId,height:job.template.height,extranonce1:job.extranonce1,extranonce2Size:job.extranonce2Size,generatedAt:now()}
    })
  }

  function difficultyUpdate(){return difficultyMessage(difficultyState.difficulty)}

  function verifyWorkerSolution({extranonce2,ntime,nonce}={}){
    const job=requireJob()
    const coinbase=buildWorkerCoinbase({extranonce2})
    const branch=merkleBranchForCoinbase(job.template.transactions.map(tx=>tx.txid))
    const merkleRoot=applyMerkleBranch(coinbase.txid,branch)
    const time=Number.parseInt(String(ntime),16)
    const nonceNum=Number.parseInt(String(nonce),16)
    if(!Number.isInteger(time)||!Number.isInteger(nonceNum))throw new Error('INVALID_HEADER_FIELDS')
    if(time<job.template.mintime||time>Math.floor(Date.now()/1000)+7200)throw new Error('NTIME_OUT_OF_RANGE')
    const header=serializeHeader({version:job.template.version,previousBlockHash:job.template.previousBlockHash,merkleRoot,time,bits:job.template.bits,nonce:nonceNum})
    const hash=dsha256(header)
    const hashValue=BigInt(`0x${Buffer.from(hash).reverse().toString('hex')}`)
    const shareTarget=targetFromDifficulty(difficultyState.difficulty)
    const networkTarget=job.template.target?BigInt(`0x${job.template.target}`):targetFromCompactBits(job.template.bits)
    const accepted=hashValue<=shareTarget
    const blockCandidate=hashValue<=networkTarget
    const submission=Object.freeze({
      submissionId:`sub_${crypto.randomUUID()}`,
      jobId:job.runtimeJobId,
      templateId:job.template.templateId,
      verified:true,
      accepted,
      blockCandidate,
      hash:reverseHex(hash.toString('hex')),
      difficulty:String(difficultyState.difficulty),
      extranonce2,ntime,nonce,verifiedAt:now()
    })
    if(accepted)difficultyState=recordAcceptedShare(difficultyState)
    return Object.freeze({submission,header,coinbase,merkleRoot,branch,shareTarget:shareTarget.toString(16),networkTarget:networkTarget.toString(16)})
  }

  async function submitIfBlockCandidate(solution){
    if(!solution?.submission?.verified||!solution.submission.blockCandidate)throw new Error('VERIFIED_BLOCK_CANDIDATE_REQUIRED')
    const job=requireJob()
    const blockHex=serializeBlock({header:solution.header,coinbaseFullHex:solution.coinbase.fullHex,transactions:job.template.transactions})
    return submitBlockCandidate({blockHex,submission:solution.submission,rpc})
  }

  return Object.freeze({poolId,refreshTemplate,notifyMessage,difficultyUpdate,verifyWorkerSolution,submitIfBlockCandidate,currentJob:()=>current,currentDifficulty:()=>difficultyState.difficulty})
}
