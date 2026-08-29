import {PersistentStateStore} from './persistentStore.mjs'
import {bitcoinRpcClient,transactionStatus} from './bitcoinWallet.mjs'
import {runRecoverySweep,createRecoveryIncident,RECOVERY_ACTIONS} from './recovery.mjs'
import {confirmPayout,createSettlementReceipt} from './payouts.mjs'

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

if(process.exitCode!==1) await import('./server.mjs')
