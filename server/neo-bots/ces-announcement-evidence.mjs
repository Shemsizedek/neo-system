const STATES=Object.freeze({REJECTED:'TV-0',NOTATION_VERIFIED:'TV-1',LEDGER_MATCHED:'TV-2',COMMUNITY_EVIDENCE_VERIFIED:'TV-3',EXTERNALLY_VERIFIED:'TV-4'});

export const CES_EVIDENCE_STATES=STATES;
export const WCU_NOTATION_REFERENCES=Object.freeze([
  'https://worldcreditunion.finance.blog/world-notations/',
  'https://worldcreditunion.finance.blog/smart-deposits/'
]);

function clean(v){return String(v??'').replace(/\s+/g,' ').trim();}
function match(text,re){const m=String(text||'').match(re);return m?clean(m[1]):null;}

export function parseCesAnnouncement({id=null,date=null,title='',text='' }={}){
  const raw=clean(`${title}\n${text}`);
  const lower=raw.toLowerCase();
  const route=/draft deposit/.test(lower)?'draft-deposit':/check deposit/.test(lower)?'check-deposit':/book entry|credit voucher/.test(lower)?'book-entry':null;
  const transactionNumber=match(raw,/transaction\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Za-z0-9._/-]+)/i);
  const hours=match(raw,/hours?\s*[:#-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const hash=match(raw,/(?:hash|txid|transaction hash)\s*[:#-]?\s*([A-Fa-f0-9]{16,}|[A-Za-z0-9._/-]{16,})/i);
  const checkNumber=match(raw,/check\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Za-z0-9._/-]+)/i)||match(raw,/e-?check\s*[:#-]\s*([A-Za-z0-9._/-]+)/i);
  const tradeSlip=match(raw,/trade\s*slip\s*[:#-]?\s*([A-Za-z0-9._/-]+)/i);
  const creditVoucher=match(raw,/credit\s*voucher\s*[:#-]?\s*([A-Za-z0-9._/-]+)/i);
  const cesTransactionId=match(raw,/CES\s*transaction\s*(?:ID|number|no\.?|#)?\s*[:#-]?\s*([A-Za-z0-9._/-]+)/i);
  const seller=match(raw,/seller\s*:\s*(.+?)(?=\s+(?:buyer|amount|description|options)\s*:|$)/i);
  const buyer=match(raw,/buyer\s*:\s*(.+?)(?=\s+(?:seller|amount|description|options)\s*:|$)/i);
  const amount=match(raw,/amount\s*:\s*([^\s]+)/i);
  const accountMatches=[...raw.matchAll(/\b([A-Z]{2,8}\d{3,8})\b/g)].map(x=>x[1]);
  const financialInstitutionCes=accountMatches[0]||null;
  let valid=false;
  if(route==='draft-deposit') valid=Boolean(transactionNumber&&(hours||hash));
  else if(route==='check-deposit') valid=Boolean(tradeSlip||checkNumber);
  else if(route==='book-entry') valid=Boolean(creditVoucher&&cesTransactionId);
  return Object.freeze({schema:'neo.ces.announcement-evidence.v1',id,date,title:clean(title),route,notationValid:valid,state:valid?STATES.NOTATION_VERIFIED:STATES.REJECTED,transactionNumber,hours,hash,tradeSlip,checkNumber,creditVoucher,cesTransactionId,seller,buyer,amount,financialInstitutionCes,rawText:clean(text)});
}

export function reconcileAnnouncement(record,{ledgerTransactions=[],communityEvidence=[],externalVerification=false}={}){
  if(!record?.notationValid)return Object.freeze({...record,state:STATES.REJECTED,ledgerMatch:null});
  const keys=[record.cesTransactionId,record.transactionNumber,record.tradeSlip,record.checkNumber,record.hash].filter(Boolean).map(String);
  const ledgerMatch=ledgerTransactions.find(tx=>keys.some(key=>[tx?.id,tx?.transactionId,tx?.transactionNumber,tx?.tradeSlip,tx?.checkNumber,tx?.hash].filter(Boolean).map(String).includes(key)))||null;
  if(!ledgerMatch)return Object.freeze({...record,state:STATES.NOTATION_VERIFIED,ledgerMatch:null});
  const evidenceMatch=communityEvidence.find(ev=>keys.some(key=>[ev?.id,ev?.transactionId,ev?.transactionNumber,ev?.tradeSlip,ev?.checkNumber,ev?.hash,ev?.creditVoucher].filter(Boolean).map(String).includes(key)))||null;
  const state=externalVerification?STATES.EXTERNALLY_VERIFIED:evidenceMatch?STATES.COMMUNITY_EVIDENCE_VERIFIED:STATES.LEDGER_MATCHED;
  return Object.freeze({...record,state,ledgerMatch,evidenceMatch});
}

export function buildAnnouncementEvidenceFeed(announcements=[],options={}){
  const records=announcements.map(parseCesAnnouncement).map(r=>reconcileAnnouncement(r,options));
  return Object.freeze({schema:'neo.ces.announcement-evidence-feed.v1',generatedAt:new Date().toISOString(),records,counts:Object.freeze(records.reduce((a,r)=>(a[r.state]=(a[r.state]||0)+1,a),{}))});
}
