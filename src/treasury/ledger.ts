/** NEO-TMS G002: pure, sandbox-only treasury accounting primitives. */
export type Currency = 'USD' | 'BTC' | 'XCP' | 'INFINITY';
export type Fund = 'GENERAL'|'CHAPLAINCY'|'SICK'|'NATIONAL_CONVENTION'|'WORLD_CONVENTION'|'TEMPLE_TRUST'|'FORFEITURE';
export type LedgerLine = {account:string; fund:Fund; currency:Currency; debit:bigint; credit:bigint};
export type Journal = {id:string; source:string; createdAt:string; lines:LedgerLine[]; approvedBy:string[]; status:'DRAFT'|'POSTED'};
export type Assessment = {id:string; memberId:string; templeId:string; currency:Currency; amountMinor:bigint; dueDay:1; graceThroughDay:7; authorityDocument:string; status:'DRAFT'|'ISSUED'|'PAID'|'WAIVED'};
export const perCapitaPolicy = {label:'Per Capita Assessment',unit:'∞1',currency:'INFINITY' as const,dueDay:1 as const,graceThroughDay:7 as const,rateConversion:'UNDEFINED — do not infer USD value'};
export const treasuryFunds:Fund[]=['GENERAL','CHAPLAINCY','SICK','NATIONAL_CONVENTION','WORLD_CONVENTION','TEMPLE_TRUST','FORFEITURE'];
export function validateJournal(j:Journal):string[] {
 const errors:string[]=[];
 if(!j.id||!j.source||!j.createdAt) errors.push('Missing journal provenance');
 if(j.lines.length<2) errors.push('At least two ledger lines required');
 const currencies=new Set(j.lines.map(l=>l.currency));
 for(const c of currencies) {
  const lines=j.lines.filter(l=>l.currency===c);
  const debit=lines.reduce((s,l)=>s+l.debit,0n);
  const credit=lines.reduce((s,l)=>s+l.credit,0n);
  if(debit!==credit) errors.push('Unbalanced currency: '+c);
 }
 for(const l of j.lines) {
  if(!l.account||!treasuryFunds.includes(l.fund)) errors.push('Invalid account or fund');
  if(l.debit<0n||l.credit<0n||((l.debit>0n)===(l.credit>0n))) errors.push('Each line requires exactly one positive debit or credit');
 }
 if(j.status==='POSTED'&&new Set(j.approvedBy).size<2) errors.push('Posted journals require two distinct approvers');
 return errors;
}
export function postJournal(j:Journal):Journal {
 const candidate={...j,status:'POSTED' as const};
 const errors=validateJournal(candidate);
 if(errors.length) throw new Error(errors.join('; '));
 return candidate;
}
export function fundBalances(journals:Journal[],currency:Currency):Record<Fund,bigint>{
 const totals=Object.fromEntries(treasuryFunds.map(f=>[f,0n])) as Record<Fund,bigint>;
 for(const j of journals.filter(j=>j.status==='POSTED')) for(const l of j.lines.filter(l=>l.currency===currency)){
  totals[l.fund]+=l.debit-l.credit;
 }
 return totals;
}
