// NEO-ACT-004 — conservative read-only Treasury register.
const TYPES=new Set(['ASSET','LIABILITY','COMMUNITY_CREDIT','CUSTODY_OBSERVATION']);
const num=s=>typeof s==='string'&&/^(0|[1-9][0-9]*)$/.test(s);
export function reconcileRegister({records=[],asOf}){
 if(!Array.isArray(records)||typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOf))throw new TypeError('Records and reporting date required');
 const ids=new Set(),balances=new Map(),pending=[];
 for(const r of records){
  if(!r||typeof r.id!=='string'||!r.id.trim()||ids.has(r.id)||!TYPES.has(r.type))throw new TypeError('Unique ID and category required');
  ids.add(r.id);
  if(typeof r.sourceId!=='string'||!r.sourceId.trim()||typeof r.unit!=='string'||!r.unit.trim()||!num(r.amountMinor))throw new TypeError('Source, unit, integer amount required');
  if(r.type==='ASSET'&&!(r.ownershipVerified===true&&r.custodyVerified===true&&r.valuationVerified===true)){pending.push({id:r.id,reason:'ASSET_VERIFICATION_INCOMPLETE'});continue;}
  if(r.type==='LIABILITY'&&r.enforceabilityReviewed!==true){pending.push({id:r.id,reason:'LIABILITY_REVIEW_REQUIRED'});continue;}
  if(r.type==='COMMUNITY_CREDIT'||r.type==='CUSTODY_OBSERVATION'){pending.push({id:r.id,reason:'NON_BALANCE_SHEET_OBSERVATION'});continue;}
  const key=r.type+'|'+r.unit+'|'+(r.fundId||'UNASSIGNED');
  balances.set(key,(balances.get(key)||0n)+BigInt(r.amountMinor));
 }
 return {schema:'NEO-ACT-004',asOf,status:'UNAUDITED_READ_ONLY',
  classified:[...balances].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,value])=>{const [type,unit,fundId]=key.split('|');return {type,unit,fundId,amountMinor:value.toString()}}),
  pending,limitations:['No cross-unit netting','No automatic recognition of bearer instruments, internal credits or issuer-issued obligations','Verified flags are external assertions requiring independent control testing']};
}
export function reconcileJournal({entries=[]}){
 if(!Array.isArray(entries))throw new TypeError('Entries array required');
 const postings=new Map(),seen=new Set();
 for(const e of entries){
  if(!e||typeof e.id!=='string'||seen.has(e.id)||!e.id||typeof e.transactionId!=='string'||!e.transactionId||!num(e.amountMinor)||!['DEBIT','CREDIT'].includes(e.side)||typeof e.unit!=='string'||!e.unit)throw new TypeError('Invalid journal line');
  seen.add(e.id);const key=e.transactionId+'|'+e.unit;
  const p=postings.get(key)||{debit:0n,credit:0n};
  p[e.side==='DEBIT'?'debit':'credit']+=BigInt(e.amountMinor);
  postings.set(key,p);
 }
 return [...postings].map(([key,p])=>({transactionId:key.slice(0,key.lastIndexOf('|')),unit:key.slice(key.lastIndexOf('|')+1),balanced:p.debit===p.credit,debitMinor:p.debit.toString(),creditMinor:p.credit.toString()}));
}
