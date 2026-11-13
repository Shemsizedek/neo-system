// Project 144 separation of NOMNI blockchain units, CES mutual credit and V-Dollar.
// This classification is descriptive, not an external ledger or reserve attestation.
export function classifyNomniValueRecord(record = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('Record required');
  const {sourceSystem,unit,network,exchangeId} = record;
  if(sourceSystem === 'counterparty' && unit === 'NOMNI' && network === 'bitcoin') {
    return Object.freeze({
      classification:'COUNTERPARTY_NOMNI_ASSET',
      reserveEligibleUsd:false, redeemedAtUsdOne:false,
      isCesCredit:false, valueMovementAuthorized:false,
    });
  }
  if(sourceSystem === 'ces' && (unit === 'NMNI' || unit === 'Nomni' || unit === 'V-Dollar' || unit === 'VDOLLAR') &&
    exchangeId === 'NMNI' && network == null) {
    return Object.freeze({
      classification: unit === 'V-Dollar' || unit === 'VDOLLAR' ?
        'CES_V_DOLLAR_BOOK_ENTRY_UNVERIFIED' : 'CES_MUTUAL_CREDIT_BOOK_ENTRY',
      reserveEligibleUsd:false, redeemedAtUsdOne:false,
      isCesCredit:true, valueMovementAuthorized:false,
    });
  }
  throw new Error('Unknown source ledger/unit/network; no automatic equivalence or reserve classification');
}

export function rejectCesAsUsdReserves(reserveRecords) {
  if(!Array.isArray(reserveRecords))throw new TypeError('Reserve records must be an array');
  for(const r of reserveRecords) {
    if(!r || typeof r !== 'object' || r.sourceSystem === 'ces' ||
      r.sourceSystem === 'counterparty' ||
      ['NOMNI','NMNI','V-Dollar','VDOLLAR','XCP','BTC'].includes(r.unit) ||
      r.asset === 'NOMNI' || r.asset === 'XCP' ||
      r.claimedSource === 'internal_credit' || r.isSelfAttested === true) {
      throw new Error('CES, NOMNI, crypto and self-attested credit cannot be assumed eligible USD reserves');
    }
  }
  // Returning false is intentional: eligibility requires external independent review.
  return Object.freeze({eligibleUsdReservesVerified:false,reviewRequired:true});
}
