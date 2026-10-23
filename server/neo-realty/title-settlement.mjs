export const FINANCIAL_GENRES=Object.freeze(['REAL_ESTATE_TITLE','EQUITY','DEBT','PAYMENTS','FUNDS','INSURANCE','CREDIT','DIGITAL_ASSETS']);
const hex64=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x);
export function verifyTitleSettlement(e) {
 const failed=[];
 if(e?.financial_asset_class!=='REAL_ESTATE_TITLE')failed.push('asset class');
 if(!e?.parcel_id)failed.push('parcel');
 if(!hex64(e?.payment_btc_txid)||!(Number.isSafeInteger(e?.payment_confirmations)&&e.payment_confirmations>=6))failed.push('bitcoin payment confirmation');
 if(!e?.counterparty_payment_verified || e?.nomni_amount_reconciled!==true)failed.push('NOMNI Counterparty settlement');
 if(!e?.multisig_quorum_verified || !e?.escrow_release_attested)failed.push('multisig escrow release');
 if(!hex64(e?.deed_document_sha256)||!e?.recording_office||!e?.deed_book||!e?.deed_page||!e?.recording_date)failed.push('recorded deed evidence');
 if(!e?.attorney_title_attestation_verified || !e?.county_record_verified || !e?.deed_parcel_match)failed.push('legal title confirmation');
 if(!hex64(e?.crown_event_hash)||!hex64(e?.crown_anchor_txid)||!(Number.isSafeInteger(e?.crown_anchor_confirmations)&&e.crown_anchor_confirmations>=6))failed.push('Crown Chain Bitcoin anchor');
 if(e?.bitcoin_reorg || e?.disputed || e?.evidence_revoked)failed.push('chain or evidence exception');
 return {verified:failed.length===0,failed};
}
export function projectNeoScanTitle(e) {
 const result=verifyTitleSettlement(e);
 if(!result.verified)return null;
 return Object.freeze({type:'NEO_TITLE',genre:'REAL_ESTATE_TITLE',case_id:e.case_id,parcel_id:e.parcel_id,payment_btc_txid:e.payment_btc_txid,crown_event_hash:e.crown_event_hash,crown_anchor_txid:e.crown_anchor_txid,recording_office:e.recording_office,deed_book:e.deed_book,deed_page:e.deed_page,recording_date:e.recording_date,status:'VERIFIED_TITLE_SETTLEMENT'});
}
