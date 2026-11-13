// Project 144: per-account CES Virtual-Dollar bookkeeping check, strictly offline.
// No bank balance, reserve ownership, signer, customer record or onchain movement here.
// Individual account arithmetic does not establish CES-wide outstanding liabilities.
const KEYS=new Set(['sourceSystem','unit','statementReference','opening','tradeCredits','clearedDepositCredits',
 'tradeDebits','usdRedemptionDebits','closing']);
function cents(value) {
 if(typeof value!=='string' || !/^(0|[1-9]\d{0,17})(?:\.\d{1,2})?$/.test(value)){
   throw new Error('Invalid currency amount; use explicit two-decimal string');
 }
 const [whole,fraction='']=value.split('.');
 return BigInt(whole)*100n + BigInt(fraction.padEnd(2,'0')||'0');
}
export function assessCesVDollarAccountStatement(record) {
 if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Account aggregate required');
 if(Object.keys(record).some(x=>!KEYS.has(x)))throw new Error('Unapproved account or PII fields');
 if(record.sourceSystem!=='ces' || record.unit!=='VDOLLAR' ||
   typeof record.statementReference!=='string' ||
   !/^evidence:[a-z0-9_-]{8,64}$/i.test(record.statementReference))throw new Error('Invalid CES evidence reference');
 const opening=cents(record.opening),tc=cents(record.tradeCredits),dc=cents(record.clearedDepositCredits);
 const td=cents(record.tradeDebits),rd=cents(record.usdRedemptionDebits),closing=cents(record.closing);
 const calculated=opening+tc+dc-td-rd;
 if(calculated<0n || closing!==calculated)throw new Error('CES account debit/credit discrepancy');
 return Object.freeze({
  outcome:'HISTORICAL_CES_ACCOUNT_ARITHMETIC_ONLY',
  reportedClosingCents:closing.toString(),
  reportedTradeCreditCents:tc.toString(),
  reportedClearedDepositCreditCents:dc.toString(),
  statementArithmeticReconciled:true,
  authenticatedLiveCESBalanceVerified:false,
  allAccountsLiabilityTotalVerified:false,
  independentlyConfirmedCustodianCash:false,
  issuerLegallyAuthorized:false,
  redemptionFulfillmentVerified:false,
  eligibleNomniUsdBackingVerified:false,
  automatedCreditIssuanceAuthorized:false,
 });
}
