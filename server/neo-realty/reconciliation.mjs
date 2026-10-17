import { verifyTitleSettlement, projectNeoScanTitle } from './title-settlement.mjs';
const hex64=x=>typeof x==='string' && /^[a-f0-9]{64}$/i.test(x);
/**
 * Adapters are injected authority clients, NOT truthy caller-supplied flags.
 * btc.lookup(txid) => {txid,confirmations,blockHash}
 * counterparty.lookup(txid) => {btcTxid,asset,quantity,destination,valid}
 * escrow.verify(input) => {quorumVerified,releaseAttested}
 * county.verify(input) => {recorded,parcelMatch,office,book,page,date,attorneyVerified,documentSha256}
 * crown.verify(input) => {eventHash,anchorTxid,anchorConfirmations,valid}
 */
export async function reconcileTitle(input, clients) {
  if(!input || !hex64(input.payment_btc_txid)) throw new Error('Bitcoin payment txid required');
  for(const name of ['btc','counterparty','escrow','county','crown']) if(!clients?.[name]) throw new Error('Missing authority adapter: '+name);
  const btc=await clients.btc.lookup(input.payment_btc_txid);
  const cp=await clients.counterparty.lookup(input.payment_btc_txid);
  const escrow=await clients.escrow.verify(input);
  const county=await clients.county.verify(input);
  const crown=await clients.crown.verify(input);
  const normalized={
    case_id:input.case_id, parcel_id:input.parcel_id,financial_asset_class:'REAL_ESTATE_TITLE',
    payment_btc_txid:input.payment_btc_txid,
    payment_confirmations:btc?.txid===input.payment_btc_txid?btc.confirmations:0,
    counterparty_payment_verified:cp?.valid===true && cp?.btcTxid===input.payment_btc_txid && cp.asset==='NOMNI' && cp.destination===input.seller_wallet && Number.isSafeInteger(input.nomni_base_units) && cp.quantityBaseUnits===input.nomni_base_units,
    nomni_amount_reconciled:Number.isSafeInteger(input.nomni_base_units) && input.nomni_base_units>0 && cp?.quantityBaseUnits===input.nomni_base_units,
    multisig_quorum_verified:escrow?.quorumVerified===true,
    escrow_release_attested:escrow?.releaseAttested===true,
    deed_document_sha256:county?.documentSha256,
    recording_office:county?.office,deed_book:county?.book,deed_page:county?.page,recording_date:county?.date,
    attorney_title_attestation_verified:county?.attorneyVerified===true,
    county_record_verified:county?.recorded===true,deed_parcel_match:county?.parcelMatch===true,
    crown_event_hash:crown?.eventHash,crown_anchor_txid:crown?.anchorTxid,
    crown_anchor_confirmations:crown?.valid===true?crown.anchorConfirmations:0,
    bitcoin_reorg:btc?.reorg===true,disputed:input.disputed===true,evidence_revoked:crown?.revoked===true
  };
  const decision=verifyTitleSettlement(normalized);
  return {status:decision.verified?'VERIFIED':'RESTRICTED',failed:decision.failed,publicRecord:decision.verified?projectNeoScanTitle(normalized):null,authoritiesChecked:['btc','counterparty','escrow','county','crown']};
}
export function projectFinancialMarketIndex(items=[]) {
  return items.filter(x=>x?.status==='VERIFIED'&&x.publicRecord?.status==='VERIFIED_TITLE_SETTLEMENT').map(x=>x.publicRecord);
}
