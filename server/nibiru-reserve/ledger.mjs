import crypto from 'node:crypto';

const clean=value=>String(value??'').trim();
const amount=value=>{const n=Number(value);if(!Number.isFinite(n)||n<=0)throw new Error('amount must be positive');return Number(n.toFixed(8))};

export function createReserveLedger({now=()=>new Date().toISOString()}={}){
  const journals=new Map();

  function postJournal(input){
    if(!clean(input.reference)||!clean(input.unit))throw new Error('reference and unit are required');
    if(!Array.isArray(input.lines)||input.lines.length<2)throw new Error('journal requires at least two lines');
    const lines=input.lines.map(line=>({
      account:clean(line.account),debit:line.debit?amount(line.debit):0,credit:line.credit?amount(line.credit):0,
      memo:clean(line.memo)
    }));
    if(lines.some(line=>!line.account||Boolean(line.debit)===Boolean(line.credit)))throw new Error('each line requires one account and exactly one debit or credit');
    const debits=Number(lines.reduce((sum,line)=>sum+line.debit,0).toFixed(8));
    const credits=Number(lines.reduce((sum,line)=>sum+line.credit,0).toFixed(8));
    if(debits!==credits)throw new Error('journal is not balanced');
    const duplicate=[...journals.values()].find(row=>row.reference===input.reference);
    if(duplicate)return duplicate;
    const row={id:crypto.randomUUID(),reference:clean(input.reference),unit:clean(input.unit).toUpperCase(),postedAt:now(),debits,credits,lines,status:'POSTED'};
    journals.set(row.id,row);return row;
  }

  function postCesObservation(position){
    return postJournal({reference:`CES:${position.externalReference}`,unit:position.unit,lines:[
      {account:'MEMO.CES.POSITIONS',debit:position.amount,memo:'Observed CES position'},
      {account:'MEMO.CES.OFFSET',credit:position.amount,memo:'Non-recognized memorandum offset'}
    ]});
  }

  function trialBalance(){
    const accounts={};
    for(const journal of journals.values())for(const line of journal.lines){
      const key=`${journal.unit}:${line.account}`;const row=accounts[key]??={unit:journal.unit,account:line.account,debit:0,credit:0};
      row.debit=Number((row.debit+line.debit).toFixed(8));row.credit=Number((row.credit+line.credit).toFixed(8));
    }
    return{generatedAt:now(),journals:journals.size,accounts:Object.values(accounts),balanced:Object.values(accounts).reduce((s,r)=>s+r.debit-r.credit,0)===0};
  }
  return{postJournal,postCesObservation,trialBalance,journals};
}
