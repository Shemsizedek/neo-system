// NCC-017: discover only an approved Counterparty "creation" event from a fixed upstream.
// Read-only; no webhook-supplied "verified" flag, no wallet signing, no on-chain action.
// This is NEO canonical metadata for public presentation. Asset IDs are protocol data.
import {validateApprovedIntent} from './issuance-reconciler.mjs';

const CORE='https://api.counterparty.io:4000/v2';
const HASH=/^[a-f0-9]{64}$/i;
const MAX_EVENTS=100;
const MAX_BODY=131072;
const REQUEST_TIMEOUT_MS=7000;

function rawUnits(value){
  if(typeof value==='number'&&(!Number.isSafeInteger(value)||value<0))throw Error('unsafe_issuance_quantity');
  if(!['number','string'].includes(typeof value)||!/^\d{1,100}$/.test(String(value)))throw Error('invalid_issuance_quantity');
  return BigInt(value);
}
async function boundedJson(response){
  if(!response || response.status!==200 || response.redirected || response.headers.get('location') ||
     !response.headers?.get('content-type')?.toLowerCase().includes('application/json')){
    if(response?.status===404)return null; // An approved but not yet issued asset may not exist.
    throw Error('counterparty_event_endpoint_unavailable');
  }
  if(response.headers.get('X-COUNTERPARTY-READY')==='false')throw Error('counterparty_event_provider_not_ready');
  const length=Number(response.headers.get('content-length')||0);
  if(length>MAX_BODY)throw Error('counterparty_event_response_too_large');
  if(!response.body?.getReader)throw Error('counterparty_event_stream_required');
  const reader=response.body.getReader();
  const pieces=[];let bytes=0;
  for(;;){
    const {done,value}=await reader.read();
    if(done)break;
    bytes+=value.byteLength;
    if(bytes>MAX_BODY){await reader.cancel();throw Error('counterparty_event_response_too_large');}
    pieces.push(value);
  }
  const buffer=new Uint8Array(bytes);let at=0;
  for(const piece of pieces){buffer.set(piece,at);at+=piece.byteLength;}
  const value=JSON.parse(new TextDecoder().decode(buffer));
  if(!value||typeof value!=='object'||value.error||!Array.isArray(value.result))throw Error('counterparty_event_invalid_payload');
  return value;
}

/**
 * Reconcile an operator-approved initial issuance intent with an independently read
 * Counterparty creation event. Do not trust a client-submitted event or tx hash.
 * Returns {status:'pending'} when no asset exists, never a fabricated confirmation.
 */
export async function observeApprovedCrownCreation(intent,{fetchImpl=fetch}={}){
  const approved=validateApprovedIntent(intent,{requireTransaction:false});
  const url=CORE+'/assets/'+approved.prepared.asset+'/issuances?limit='+MAX_EVENTS;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),REQUEST_TIMEOUT_MS);
  let envelope;
  try{
    const response=await fetchImpl(url,{
      method:'GET',redirect:'error',signal:abort.signal,
      headers:{accept:'application/json','user-agent':'NEO-Crown-Issuance-Creation-Watch/1.0'}
    });
    envelope=await boundedJson(response);
  }finally{clearTimeout(timer);}
  if(envelope===null)return {status:'pending',asset:intent.asset,reason:'creation_not_observed'};
  if(envelope.next_cursor!==null&&envelope.next_cursor!==undefined)throw Error('issuance_event_history_truncated');
  if(envelope.result.length>MAX_EVENTS||envelope.result_count!==undefined&&envelope.result_count!==envelope.result.length)
    throw Error('issuance_event_history_truncated');
  const matches=envelope.result.filter(row=>row&&row.asset===approved.prepared.asset&&row.asset_events==='creation');
  if(matches.length===0)return {status:'pending',asset:intent.asset,reason:'creation_not_observed'};
  if(matches.length!==1)throw Error('ambiguous_creation_event');
  const event=matches[0];
  if(event.status!=='valid'||event.transfer!==false||event.source!==intent.owner_address||event.issuer!==intent.issuer_address)
    throw Error('unapproved_issuance_source_or_status');
  if(event.description!==approved.prepared.asset_description_for_signer)throw Error('creation_description_not_neo_canonical');
  if(rawUnits(event.quantity)!==approved.quantity_raw)throw Error('creation_quantity_does_not_match_approval');
  if(!HASH.test(event.tx_hash)||!Number.isSafeInteger(event.block_index)||event.block_index<=0)
    throw Error('invalid_creation_transaction');
  if(intent.tx_hash!==undefined&&intent.tx_hash!==null&&intent.tx_hash.toLowerCase()!==event.tx_hash.toLowerCase())
    throw Error('approved_tx_hash_conflicts_with_creation');
  return {
    status:'creation_observed_unconfirmed',asset:intent.asset,
    intent_with_observed_tx:{...intent,tx_hash:event.tx_hash.toLowerCase()},
    observation:{
      authority:'counterparty_core_api_v2',event_type:'creation',source_url:url,
      tx_hash:event.tx_hash.toLowerCase(),block_index:event.block_index,
      quantity_raw:String(event.quantity),issuer:event.issuer,
      wallet_control_verified_by_neo:false,
      confirmations_verified:false
    }
  };
}
