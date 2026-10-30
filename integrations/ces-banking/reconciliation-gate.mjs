/**
 * Project 144: pure CES / Bitcoin / banking evidence gate.
 * No network, private credentials, payment creation, bank access, or mutation.
 */
const CES_ORIGIN='https://www.community-exchange.org';
const CES_READ_PATHS=new Set([
  '/_admin/reptrades.asp',
  '/_admin/statsindex.asp',
  '/_admin/groupmain.asp',
  '/_admin/convrates.asp',
]);
const REFERENCE=/^ref_[A-Za-z0-9_-]{8,80}$/;
const EXCHANGES=new Set(['NMNI','XCPC']);
const KINDS=new Set(['CES_MUTUAL_CREDIT','CES_V_DOLLAR','COUNTERPARTY_NOMNI','COUNTERPARTY_XCP','BITCOIN_BTC','BANK_FIAT_OBSERVATION']);
const KEYS=new Set(['reference','kind','source','exchange','unit','amount','direction','asOf','status','rail']);
const DECIMAL=/^(?:0|[1-9]\d{0,20})(?:\.\d{1,8})?$/;
const KIND_UNIT=Object.freeze({
 CES_MUTUAL_CREDIT:'NMNI',
 CES_V_DOLLAR:'VDOLLAR',
 COUNTERPARTY_NOMNI:'NOMNI',
 COUNTERPARTY_XCP:'XCP',
 BITCOIN_BTC:'BTC',
 BANK_FIAT_OBSERVATION:'USD',
});
export function assertSafeCesReportRequest(raw,{method='GET'}={}){
 if(method!=='GET'||typeof raw!=='string'||raw.length>250)throw new Error('CES report GET only');
 let u;try{u=new URL(raw)}catch{throw new Error('Invalid CES URL')}
 // Reject all query parameters including CES legacy URLs that embed username/password.
 if(u.origin!==CES_ORIGIN||u.username||u.password||u.search||u.hash||
   /%2f|%5c|\\|\/\.\./i.test(u.pathname))throw new Error('Unsafe CES URL or embedded credentials');
 if(!CES_READ_PATHS.has(u.pathname))throw new Error('CES report path not allowlisted');
 return Object.freeze({origin:u.origin,pathname:u.pathname,method:'GET',purpose:'report-discovery-only',bodyAllowed:false});
}
export function validateSanitizedObservation(row){
 if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!KEYS.has(k)))
   throw new Error('Unapproved or sensitive ledger fields');
 if(!REFERENCE.test(row.reference)||!KINDS.has(row.kind)||!['credit','debit'].includes(row.direction))
   throw new Error('Invalid opaque reference, classification or direction');
 if(row.unit!==KIND_UNIT[row.kind])throw new Error('Unit mismatch: no automatic exchange rate');
 if(typeof row.amount!=='string'||!DECIMAL.test(row.amount)||!/[1-9]/.test(row.amount))
   throw new Error('Positive exact-decimal amount string required');
 if(typeof row.asOf!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(row.asOf)||
   !Number.isFinite(Date.parse(row.asOf))||
   new Date(row.asOf).toISOString()!==row.asOf.slice(0,-1)+'.000Z')
   throw new Error('Strict source timestamp required');
 if(row.kind.startsWith('CES_')){
   if(row.source!=='ces'||!EXCHANGES.has(row.exchange)||row.status!=='reported-unverified'||row.rail!==undefined)
     throw new Error('CES cannot impersonate a bank or an attested reserve');
 } else if(row.kind==='BANK_FIAT_OBSERVATION'){
   if(row.source!=='modern-treasury'||row.exchange!==undefined||!['wire','ach','book'].includes(row.rail)||
      row.status!=='reported-unverified')throw new Error('Bank provenance/status invalid');
 } else {
   if(row.source!=='bitcoin-counterparty'||row.exchange!==undefined||row.rail!==undefined||
      row.status!=='observed-unverified')throw new Error('Blockchain provenance/status invalid');
 }
 if(row.kind==='BANK_FIAT_OBSERVATION'&&row.amount.split('.')[1]?.length>2)
   throw new Error('USD amount has more than two decimal places');
 return Object.freeze({...row});
}
export function createReadOnlyEvidencePacket({observations}={}){
 if(!Array.isArray(observations)||!observations.length||observations.length>500)
   throw new Error('Expected 1-500 sanitized observations');
 const rows=observations.map(validateSanitizedObservation);
 const ids=new Set(rows.map(x=>x.reference));
 if(ids.size!==rows.length)throw new Error('Duplicate provenance reference');
 const summary={};
 for(const row of rows){
   // Never sum across units, accounting systems or exchanges.
   const key=[row.source,row.exchange||'none',row.kind,row.unit,row.direction].join(':');
   const [whole,fraction='']=row.amount.split('.');
   const scale=row.kind==='BANK_FIAT_OBSERVATION'?2:8;
   const raw=BigInt(whole)*10n**BigInt(scale)+BigInt(fraction.padEnd(scale,'0')||'0');
   summary[key]=(BigInt(summary[key]||'0')+raw).toString();
 }
 return Object.freeze({
  mode:'OFFLINE_EVIDENCE_REVIEW_ONLY',
  counts:Object.freeze({observations:rows.length,ces:rows.filter(x=>x.source==='ces').length,
   blockchain:rows.filter(x=>x.source==='bitcoin-counterparty').length,
   bank:rows.filter(x=>x.source==='modern-treasury').length}),
  bySeparateLedgerUnit:Object.freeze(summary),
  sourceRecordReferences:Object.freeze(rows.map(x=>x.reference)),
  crossLedgerSettlementVerified:false,
  liveCesBotAuthenticated:false,
  modernTreasuryConnected:false,
  fedwireBankRelationshipVerified:false,
  usdReserveCustodyVerified:false,
  nomniRedemptionAuthorized:false,
  paymentOrderAuthorized:false,
  valueMovementAuthorized:false,
 });
}
export function assessCesBankingActivation({cesBotAuthVerified=false,readonlySessionVerified=false,
  modernTreasuryReadRoleVerified=false,fedwireBankParticipationVerified=false}={}){
 return Object.freeze({
  cesBotAuthenticationClaimed:cesBotAuthVerified===true&&readonlySessionVerified===true,
  modernTreasuryReadAccessClaimed:modernTreasuryReadRoleVerified===true,
  fedwireBankParticipationClaimed:fedwireBankParticipationVerified===true,
  cesBotAuthenticated:false,
  cesReadOnlyReady:false,
  modernTreasuryReadOnlyReady:false,
  fedwireBankParticipationVerified:false,
  liveFederatedBankingEnabled:false,
  liveMoneyMovementEnabled:false,
  needsIndependentCredentialAndBankValidation:true,
 });
}
