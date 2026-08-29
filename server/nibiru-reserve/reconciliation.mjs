import crypto from 'node:crypto';

const clean=value=>String(value??'').trim();
const quantity=value=>{const n=Number(value);if(!Number.isFinite(n)||n<=0)throw new Error('quantity must be positive');return Number(n.toFixed(8))};

export function createSettlementReconciler({now=()=>new Date().toISOString(),minimumConfirmations=6,ledger}={}){
  if(!Number.isSafeInteger(minimumConfirmations)||minimumConfirmations<1)throw new Error('minimumConfirmations must be a positive integer');
  const settlements=new Map();

  function observe(input){
    for(const key of ['network','txHash','asset','blockHash'])if(!clean(input[key]))throw new Error(`${key} is required`);
    const blockHeight=Number(input.blockHeight);
    if(!Number.isSafeInteger(blockHeight)||blockHeight<0)throw new Error('blockHeight must be a non-negative integer');
    const existing=[...settlements.values()].find(row=>row.network===clean(input.network).toUpperCase()&&row.txHash===clean(input.txHash));
    if(existing)return existing;
    const row={id:crypto.randomUUID(),network:clean(input.network).toUpperCase(),txHash:clean(input.txHash),asset:clean(input.asset).toUpperCase(),quantity:quantity(input.quantity),blockHash:clean(input.blockHash),blockHeight,confirmations:Math.max(0,Number(input.confirmations)||0),status:'PENDING_CONFIRMATIONS',observedAt:now(),confirmedAt:null,reorgedAt:null,journalId:null};
    settlements.set(row.id,row);return row;
  }

  function reconcile(id,proof){
    const row=settlements.get(id);if(!row)return null;
    if(clean(proof.txHash)!==row.txHash)throw new Error('proof transaction does not match settlement');
    const canonical=proof.canonical!==false&&clean(proof.blockHash)===row.blockHash;
    if(!canonical){
      if(row.status==='CONFIRMED'&&ledger){const reversal=ledger.postJournal({reference:`REORG:${row.txHash}`,unit:row.asset,lines:[{account:'MEMO.BLOCKCHAIN.OFFSET',debit:row.quantity,memo:'Reorg reversal'},{account:'MEMO.BLOCKCHAIN.SETTLEMENTS',credit:row.quantity,memo:'Reorg reversal'}]});row.reversalJournalId=reversal.id}
      row.status='REORGED';row.reorgedAt=now();row.confirmations=0;return row;
    }
    row.confirmations=Math.max(0,Number(proof.confirmations)||0);
    if(row.confirmations>=minimumConfirmations){
      row.status='CONFIRMED';row.confirmedAt=row.confirmedAt||now();
      if(ledger&&!row.journalId){const journal=ledger.postJournal({reference:`CHAIN:${row.network}:${row.txHash}`,unit:row.asset,lines:[{account:'MEMO.BLOCKCHAIN.SETTLEMENTS',debit:row.quantity,memo:'Confirmed blockchain settlement'},{account:'MEMO.BLOCKCHAIN.OFFSET',credit:row.quantity,memo:'Non-recognized memorandum offset'}]});row.journalId=journal.id}
    }else row.status='PENDING_CONFIRMATIONS';
    return row;
  }
  function snapshot(){return{generatedAt:now(),minimumConfirmations,total:settlements.size,pending:[...settlements.values()].filter(r=>r.status==='PENDING_CONFIRMATIONS').length,confirmed:[...settlements.values()].filter(r=>r.status==='CONFIRMED').length,reorged:[...settlements.values()].filter(r=>r.status==='REORGED').length}}
  return{observe,reconcile,snapshot,settlements};
}
