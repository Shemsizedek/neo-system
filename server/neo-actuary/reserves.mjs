// NEO-ACT-002: evidence-gated, read-only fund liquidity and horizon stress.
import {assessTreasury} from './engine.mjs';
const amount=(s,label)=>{if(typeof s!=='string'||!/^(0|[1-9][0-9]*)$/.test(s))throw new TypeError(label+' must be integer minor units');return BigInt(s)};
const date=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new TypeError('ISO date required');return Date.parse(s+'T00:00:00Z')};
const unique=new Set(['restricted','unrestricted']);
export function treasuryReserveLadder({asOf,currency,assets=[],liabilities=[],horizonsDays=[7,30,90,365]}){
 const at=date(asOf),ids=new Set();
 if(!/^[A-Z0-9]{2,16}$/.test(currency||''))throw new TypeError('Currency required');
 if(!Array.isArray(assets)||!Array.isArray(liabilities))throw new TypeError('Arrays required');
 if(!Array.isArray(horizonsDays)||!horizonsDays.length||horizonsDays.some(x=>!Number.isSafeInteger(x)||x<0)||new Set(horizonsDays).size!==horizonsDays.length)throw new TypeError('Unique nonnegative horizons required');
 const verify=(r,kind)=>{
   if(!r||typeof r.id!=='string'||!r.id.trim()||ids.has(r.id))throw new TypeError('Unique record id required');
   ids.add(r.id);
   if(r.currency!==currency||r.verified!==true||typeof r.evidenceId!=='string'||!r.evidenceId.trim())throw new TypeError('Verified, source-linked, single-currency records only');
   if(!unique.has(r.restriction)||typeof r.fundId!=='string'||!r.fundId.trim())throw new TypeError('Fund and restriction required');
   if(r.restriction==='restricted'&&(!r.authorizedPurpose||typeof r.authorizedPurpose!=='string'))throw new TypeError('Restricted fund purpose required');
   const minor=amount(r.amountMinor,kind);
   const maturity=date(r.availableOn||r.dueOn);
   if(maturity<at)throw new TypeError('Past-due flows need separate aging reconciliation');
   return {...r,minor,maturity};
 };
 const a=assets.map(r=>verify(r,'asset')),l=liabilities.map(r=>verify(r,'liability'));
 const buckets=new Set([...a,...l].map(x=>x.fundId));
 const horizons=[...horizonsDays].sort((x,y)=>x-y).map(days=>{
  const stop=at+days*86400000;
  const funds=[...buckets].sort().map(fundId=>{
   const af=a.filter(x=>x.fundId===fundId&&x.maturity<=stop);
   const lf=l.filter(x=>x.fundId===fundId&&x.maturity<=stop);
   const sum=xs=>xs.reduce((v,x)=>v+x.minor,0n);
   const unrestricted=sum(af.filter(x=>x.restriction==='unrestricted'));
   const restricted=sum(af.filter(x=>x.restriction==='restricted'));
   const due=sum(lf);
   // Conservative: restricted balances cannot fund general obligations; eligibility must be reviewed by purpose.
   const freeLiabilities=sum(lf.filter(x=>x.restriction==='unrestricted'));
   const freeGap=unrestricted-freeLiabilities;
   return {fundId,availableUnrestrictedMinor:unrestricted.toString(),restrictedNotFungibleMinor:restricted.toString(),liabilitiesDueMinor:due.toString(),unrestrictedGapMinor:freeGap.toString(),unrestrictedShortfallMinor:(freeGap<0n?-freeGap:0n).toString(),restrictedPurposeReviewRequired:lf.some(x=>x.restriction==='restricted')};
  });
  return {days,funds};
 });
 // Total coverage is a separate balance-sheet snapshot, NOT spendable liquidity.
 const aggregate=assessTreasury({asOf,currency,assets:a.map(x=>({id:x.id,currency,amountMinor:x.amountMinor,verified:true,evidenceId:x.evidenceId})),liabilities:l.map(x=>({id:x.id,currency,amountMinor:x.amountMinor,verified:true,evidenceId:x.evidenceId}))});
 return {schema:'NEO-ACT-002',status:'MODEL_OUTPUT_NOT_AUDITED',asOf,currency,horizons,aggregate,limitations:['Restricted balances are not automatically fungible','Maturity assumptions require verified provenance','No live data adapters or capital movement','No actuarial solvency certification']};
}
