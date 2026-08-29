import http from 'node:http'
import {PersistentStateStore} from './persistentStore.mjs'
import {bitcoinRpcClient,transactionStatus} from './bitcoinWallet.mjs'
import {runRecoverySweep,createRecoveryIncident,RECOVERY_ACTIONS} from './recovery.mjs'
import {confirmPayout,createSettlementReceipt} from './payouts.mjs'
import {runtimeIdentityFromEnv,evaluateRuntimeDrift,buildRuntimeAttestation,isFinancialMutation} from './runtimeIdentity.mjs'

const store=new PersistentStateStore(process.env.NEO_MINER_DB_PATH||'./data/neo-miner.sqlite')
const payouts=store.list('payout')
const finalized=store.list('finalized_transaction')
const receipts=store.list('receipt')
const hashVaultEntries=store.list('hashvault_entry')

const rpcConfigured=Boolean((process.env.BITCOIN_WALLET_RPC_URL||process.env.BITCOIN_RPC_URL)&&(process.env.BITCOIN_WALLET_RPC_AUTH||process.env.BITCOIN_RPC_AUTH))
const rpc=rpcConfigured?bitcoinRpcClient({url:process.env.BITCOIN_WALLET_RPC_URL||process.env.BITCOIN_RPC_URL,auth:process.env.BITCOIN_WALLET_RPC_AUTH||process.env.BITCOIN_RPC_AUTH,timeoutMs:Number(process.env.BITCOIN_RPC_TIMEOUT_MS||10000)}):null
const receiptByTxid=new Map(receipts.filter(r=>r.txid).map(r=>[r.txid,r]))

function issueMissingReceipt(payout){
  if(receiptByTxid.has(payout.txid)) return receiptByTxid.get(payout.txid)
  const customerLedger=hashVaultEntries.filter(e=>e.customerId===payout.customerId)
  const contractIds=[...new Set(customerLedger.map(e=>e.contractId).filter(Boolean))]
  const receipt=createSettlementReceipt({payout,contractIds,ledgerEntryIds:customerLedger.map(e=>e.id)})
  store.put('receipt',receipt.receiptId,receipt,{action:'RECOVERY_RECEIPT_FINALIZED'})
  receiptByTxid.set(receipt.txid,receipt)
  return receipt
}

async function reconcile(){
  const txLookup=async txid=>{
    if(!rpc) throw new Error('BITCOIN_WALLET_RPC_NOT_CONFIGURED')
    return transactionStatus({txid,rpc})
  }
  const sweep=await runRecoverySweep({payouts,finalizedTransactions:finalized,receipts,transactionStatus:txLookup})
  for(const result of sweep.results){
    const payout=payouts.find(p=>p.id===result.payoutId)
    if(!payout) continue
    if(result.action===RECOVERY_ACTIONS.FINALIZE_RECEIPT){issueMissingReceipt(payout);continue}
    if(result.action===RECOVERY_ACTIONS.SYNC_CHAIN&&result.chain){
      if(result.chain.abandoned){
        const incident=createRecoveryIncident({payoutId:payout.id,reason:'BITCOIN_TRANSACTION_ABANDONED',detail:result.chain})
        store.put('recovery_incident',incident.id,incident,{action:'RECOVERY_INCIDENT_OPENED'});continue
      }
      const updated=confirmPayout(payout,{confirmations:result.chain.confirmations,requiredConfirmations:Number(process.env.PAYOUT_CONFIRMATIONS||1)})
      store.put('payout',updated.id,updated,{action:'RECOVERY_CHAIN_SYNC'})
      if(updated.state==='CONFIRMED') issueMissingReceipt(updated)
      continue
    }
    if(result.action===RECOVERY_ACTIONS.HOLD_FOR_OPERATOR){
      const existing=store.list('recovery_incident').find(i=>i.payoutId===payout.id&&i.state==='OPEN'&&i.reason===result.reason)
      if(!existing){const incident=createRecoveryIncident({payoutId:payout.id,reason:result.reason,detail:result.error||result.chain||null});store.put('recovery_incident',incident.id,incident,{action:'RECOVERY_INCIDENT_OPENED'})}
      continue
    }
    if(result.action===RECOVERY_ACTIONS.RESUME_SIGNING){store.appendAudit('payout',payout.id,'RECOVERY_RESUME_SIGNING_REQUIRED',{state:payout.state})}
  }
  store.appendAudit('recovery',null,'RECOVERY_SWEEP_COMPLETED',{checked:sweep.checked,rpcConfigured})
}

try{await reconcile()}catch(error){store.appendAudit('recovery',null,'RECOVERY_SWEEP_FAILED',{error:String(error?.message||error)});console.error('NEO Miner recovery supervisor failed closed:',error);process.exitCode=1}
finally{store.close()}

function currentRuntimeAttestation(){return buildRuntimeAttestation({identity:runtimeIdentityFromEnv()})}
function publicIdentity(att){return {schema:att.schema,generatedAt:att.generatedAt,identity:att.identity,drift:att.drift,signature:att.signature}}

if(process.exitCode!==1){
  const {server}=await import('./server.mjs')
  const publicPort=Number(process.env.PORT||8890)
  const internalPort=Number(process.env.NEO_MINER_INTERNAL_PORT||8892)
  server.listen(internalPort,'127.0.0.1',()=>console.log(`NEO Miner internal API listening on 127.0.0.1:${internalPort}`))

  let lastState=null
  const monitor=()=>{
    const drift=evaluateRuntimeDrift(runtimeIdentityFromEnv())
    if(drift.state!==lastState){
      console.log(JSON.stringify({event:'NEO_RUNTIME_DRIFT_STATE',state:drift.state,reasons:drift.reasons,time:new Date().toISOString()}))
      lastState=drift.state
    }
  }
  monitor()
  const timer=setInterval(monitor,Number(process.env.NEO_RUNTIME_DRIFT_CHECK_MS||30000));timer.unref()

  const guard=http.createServer((req,res)=>{
    if(req.method==='GET'&&req.url==='/identity'){
      const att=currentRuntimeAttestation()
      res.writeHead(att.drift.state==='GREEN'?200:503,{'content-type':'application/json','cache-control':'no-store'})
      return res.end(JSON.stringify(publicIdentity(att)))
    }
    const drift=evaluateRuntimeDrift(runtimeIdentityFromEnv())
    if(isFinancialMutation(req.method,req.url)&&drift.holdFinancialMutations){
      res.writeHead(423,{'content-type':'application/json','cache-control':'no-store'})
      return res.end(JSON.stringify({error:'RUNTIME_IDENTITY_DRIFT_HOLD',state:drift.state,reasons:drift.reasons}))
    }
    const upstream=http.request({host:'127.0.0.1',port:internalPort,method:req.method,path:req.url,headers:req.headers},up=>{
      res.writeHead(up.statusCode||502,up.headers)
      up.pipe(res)
    })
    upstream.on('error',error=>{
      if(!res.headersSent)res.writeHead(502,{'content-type':'application/json','cache-control':'no-store'})
      res.end(JSON.stringify({error:'INTERNAL_API_UNAVAILABLE',detail:String(error?.message||error)}))
    })
    req.pipe(upstream)
  })
  guard.listen(publicPort,'0.0.0.0',()=>console.log(`NEO Miner runtime drift guard listening on ${publicPort}`))
}
