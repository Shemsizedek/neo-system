// NOMNI founding 1:1 parity taxonomy. Descriptive obligations require external evidence;
// this module never creates a rate, a bank deposit, a redemption promise or a transfer.
export const NOMNI_PARITY_CONTEXTS=Object.freeze([
  'CES_MUTUAL_CREDIT_UNIT_PARITY',
  'CES_V_DOLLAR_BOOK_UNIT_PARITY',
  'NOMNI_INDEX_REFERENCE_PARITY',
  'USD_CASH_REDEMPTION',
]);
const credits=new Set(['CES_MUTUAL_CREDIT_UNIT_PARITY','CES_V_DOLLAR_BOOK_UNIT_PARITY']);
const approvedKeys=new Set(['context','baseUnit','quoteUnit','numerator','denominator','sourceStatus','sourceDocumentReference']);
const sources=new Set(['HISTORICAL_AUTHOR_ASSERTION','HISTORICAL_CES_STATEMENT','INDEPENDENT_VERIFIED_CURRENT_RECORD']);
export function assessNomniOneToOneEvidence(record={}) {
  if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Parity evidence object required');
  if(Object.keys(record).some(x=>!approvedKeys.has(x)))throw new Error('Unexpected or private fields prohibited');
  if(!NOMNI_PARITY_CONTEXTS.includes(record.context))throw new Error('Unknown parity context');
  if(record.numerator!=='1'||record.denominator!=='1')throw new Error('One-to-one ratio required');
  if(typeof record.baseUnit!=='string'||typeof record.quoteUnit!=='string'||
    !/^[A-Z0-9_-]{2,24}$/.test(record.baseUnit)||!/^[A-Z0-9_-]{2,24}$/.test(record.quoteUnit)) {
    throw new Error('Explicit nominal reference units required');
  }
  if(!sources.has(record.sourceStatus))throw new Error('Source provenance missing');
  if(typeof record.sourceDocumentReference!=='string'||
    !/^[A-Z0-9_-]{10,100}$/.test(record.sourceDocumentReference)) {
    throw new Error('Non-sensitive provenance reference required');
  }
  // NEO's original 1:1 unit-of-account concept is recorded, not equated with
  // a currently fundable bank deposit or universal 1 NOMNI = 1 USD promise.
  return Object.freeze({
    context:record.context,baseUnit:record.baseUnit,quoteUnit:record.quoteUnit,
    nominalRatio:'1:1',sourceStatus:record.sourceStatus,
    historicalUnitParityRecorded:credits.has(record.context) ||
      record.context==='NOMNI_INDEX_REFERENCE_PARITY',
    presentMarketPriceUsdVerified:false,
    liveCESBalanceVerified:false,usdReserveVerified:false,
    cashRedemptionAuthorized:false,externalLegalAuthorityVerified:false,
    valueMovementAuthorized:false,
    review:'SOURCE_AND_LEGAL_VERIFICATION_REQUIRED',
  });
}
