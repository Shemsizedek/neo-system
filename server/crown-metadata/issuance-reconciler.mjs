// NCC-013 - independently read Counterparty Core before releasing a pre-approved Crown token metadata record.
// Read-only fixed upstream; never signs, composes, broadcasts, changes supply or trusts webhook confirmation flags.
import {prepareCrownIssuance,verifyIssuanceForMetadata,validateLegacyEnhancedJSON} from './issuance-autopublish.mjs';

const API='https://api.counterparty.io:4000/v2';
const HASH=/^[a-f0-9]{64}$/i;
const ASSET=/^[A-Z][A-Z0-9]{0,23}$/;
const MAX_RESPONSE_BYTES=65536;
const MAX_CONFIRMATIONS=144;
const VALID_STATUS=new Set(['valid']);

async function readCore(path,fetchImpl){
  const timer=new AbortController();
  const timeout=setTimeout(()=>timer.abort(),8000);
  try{
    const response=await fetchImpl(API+path,{
      method:'GET',redirect:'error',signal:timer.signal,
      headers:{accept:'application/json','user-agent':'NEO-Crown-Issuance-Readback/1.0'}
    });
    if(!response||response.status!==200||response.redirected||!response.headers?.get?.('content-type')?.toLowerCase().includes('application/json'))throw Error('counterparty_http_or_mime_unavailable');
    if(response.headers.get('X-COUNTERPARTY-READY')==='false')throw Error('counterparty_sync_not_ready');
    const size=Number(response.headers.get('content-length')||0);
    if(Number.isFinite(size)&&size>MAX_RESPONSE_BYTES)throw Error('counterparty_payload_too_large');
    if(!response.body?.getReader)throw Error('counterparty_stream_required');
    const reader=response.body.getReader();let bytes=0;const chunks=[];
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>MAX_RESPONSE_BYTES){await reader.cancel();throw Error('counterparty_payload_too_large');}
      chunks.push(value);
    }
    const buffer=new Uint8Array(bytes);let offset=0;
    for(const part of chunks){buffer.set(part,offset);offset+=part.byteLength;}
    const json=JSON.parse(new TextDecoder().decode(buffer));
    if(!json||typeof json!=='object'||!Object.hasOwn(json,'result')||json.error)throw Error('counterparty_invalid_envelope');
    return json.result;
  } finally{clearTimeout(timeout);}
}
function strictBigInt(value){
  if(!(typeof value==='string'||typeof value==='number')||!/^\d+$/.test(String(value)))throw Error('invalid_issuance_quantity');
  if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('unsafe_numeric_quantity');
  return BigInt(value);
}
function height(value){
  if(!Number.isSafeInteger(value)||value<1||value>20000000)throw Error('invalid_bitcoin_height');
  return value;
}
function hash(value){
  if(typeof value!=='string'||!HASH.test(value))throw Error('invalid_transaction_hash');
  return value.toLowerCase();
}
function payloadObject(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_'+label+'_response');
  return value;
}
export function createCrownIssuanceIntentDraft({asset,ownerAddress,quantityRaw,description,website}={}){
  const prepared=prepareCrownIssuance({asset,ownerAddress,description,website});
  const units=strictBigInt(quantityRaw);
  if(units<=0n)throw Error('positive_initial_issuance_required');
  return {
    schema:'neo.crown.issuance-intent.v1',operation:'initial_issuance',network:'bitcoin-mainnet',protocol:'counterparty',
    asset:prepared.asset,owner_address:prepared.owner_address,issuer_address:prepared.owner_address,
    quantity_raw:units.toString(),asset_description_for_signer:prepared.asset_description_for_signer,
    metadata:prepared.metadata,tx_hash:null,
    approval:{state:'DRAFT_REQUIRES_OPERATOR_REVIEW',review_reference:null},
    signing_performed:false,broadcast_performed:false
  };
}
export function validateApprovedIntent(intent,{requireTransaction=true}={}){
  if(!intent||intent.schema!=='neo.crown.issuance-intent.v1'||intent.operation!=='initial_issuance'||!ASSET.test(intent.asset||''))throw Error('invalid_issuance_intent');
  if(intent.approval?.state!=='approved_for_metadata_publication'||typeof intent.approval.review_reference!=='string'||!/^https:\/\/github\.com\/Shemsizedek\/neo-system\/(pull|issues)\/[1-9]\d*$/.test(intent.approval.review_reference))throw Error('operator_review_required');
  if(intent.network!=='bitcoin-mainnet'||intent.protocol!=='counterparty')throw Error('mainnet_counterparty_only');
  if(requireTransaction||intent.tx_hash!==undefined&&intent.tx_hash!==null)hash(intent.tx_hash);
  const units=strictBigInt(intent.quantity_raw);
  if(units<=0n)throw Error('positive_initial_issuance_required');
  const prepared=prepareCrownIssuance({asset:intent.asset,ownerAddress:intent.owner_address,description:intent.metadata?.description,website:intent.metadata?.website});
  validateLegacyEnhancedJSON(prepared.metadata);
  if(intent.asset_description_for_signer!==prepared.asset_description_for_signer)throw Error('signer_description_mismatch');
  if(intent.issuer_address!==prepared.owner_address)throw Error('issuer_address_mismatch');
  // Repo approval is a recorded decision, not cryptographic wallet proof; the chain must be checked independently below.
  return {intent,prepared,quantity_raw:units};
}
export async function independentlyReconcileCrownIssuance(intent,{fetchImpl=fetch,clock=()=>new Date(),minConfirmations=6}={}){
  const {prepared,quantity_raw}=validateApprovedIntent(intent);
  if(!Number.isSafeInteger(minConfirmations)||minConfirmations<2||minConfirmations>MAX_CONFIRMATIONS)throw Error('invalid_confirmation_threshold');
  const root=payloadObject(await readCore('/',fetchImpl),'root');
  if(root.network!=='mainnet'||root.server_ready!==true||root.ledger_state!=='Following')throw Error('counterparty_not_following_mainnet');
  const [asset,issuance,tip]=await Promise.all([
    readCore('/assets/'+prepared.asset,fetchImpl),
    readCore('/issuances/'+hash(intent.tx_hash),fetchImpl),
    readCore('/blocks/last',fetchImpl)
  ]);
  const current=payloadObject(asset,'asset');
  const event=payloadObject(Array.isArray(issuance)?(issuance.length===1?issuance[0]:null):issuance,'issuance');
  const latest=payloadObject(tip,'tip');
  const eventHeight=height(event.block_index),tipHeight=height(latest.block_index);
  const confirmations=tipHeight-eventHeight+1;
  if(confirmations<minConfirmations)throw Error('insufficient_confirmations');
  const chainBlock=payloadObject(await readCore('/blocks/'+eventHeight,fetchImpl),'issuance_block');
  if(height(chainBlock.block_index)!==eventHeight||!HASH.test(chainBlock.block_hash||''))throw Error('unverified_issuance_block');
  if(event.asset!==prepared.asset||event.tx_hash?.toLowerCase()!==hash(intent.tx_hash)||!VALID_STATUS.has(event.status)||event.transfer!==false)throw Error('issuance_not_valid');
  if(event.source!==prepared.owner_address||event.issuer!==prepared.owner_address)throw Error('issuance_source_mismatch');
  if(event.description!==prepared.asset_description_for_signer)throw Error('issuance_description_mismatch');
  if(strictBigInt(event.quantity)!==quantity_raw)throw Error('issuance_quantity_mismatch');
  if(current.asset!==prepared.asset||current.issuer!==prepared.owner_address||current.owner!==prepared.owner_address)throw Error('current_asset_control_mismatch');
  if(current.description!==prepared.asset_description_for_signer)throw Error('current_asset_description_mismatch');
  if(height(current.first_issuance_block_index)!==eventHeight)throw Error('not_first_issuance');
  if(current.locked!==true&&current.locked!==false)throw Error('invalid_lock_status');
  if(root.counterparty_height && height(root.counterparty_height)<tipHeight-1)throw Error('indexer_behind_tip');
  const at=new Date(clock()).toISOString();
  const gate=verifyIssuanceForMetadata(prepared,{
    network:'bitcoin-mainnet',protocol:'counterparty',asset:prepared.asset,issuer:event.issuer,
    status:'confirmed',description:event.description,current_asset_description:current.description,
    tx_hash:event.tx_hash,block_index:eventHeight,verified_from_counterparty_api:true,checked_at:at
  });
  return {
    ...gate,stage:'CONFIRMED_READY_FOR_HOSTING',canonical_url:prepared.asset_description_for_signer,
    // Sanitized public snapshot from this same Counterparty readback. Card publishers must
    // still verify supply and divisibility before treating these fields as eligible.
    verified_ledger_snapshot:{
      asset:current.asset,
      asset_longname:typeof current.asset_longname==='string'?current.asset_longname:null,
      owner:current.owner,
      issuer:current.issuer,
      description:current.description,
      supply:(typeof current.supply==='string'&&/^\d+$/.test(current.supply))?current.supply:
        (typeof current.supply==='number'&&Number.isSafeInteger(current.supply)&&current.supply>=0?String(current.supply):null),
      divisible:typeof current.divisible==='boolean'?current.divisible:null,
      locked:current.locked,
      first_issuance_block_index:current.first_issuance_block_index
    },
    provenance:{
      authority:'counterparty_core_api_v2_single_public_endpoint',
      source_urls:[
        API+'/',API+'/assets/'+prepared.asset,API+'/issuances/'+hash(intent.tx_hash),
        API+'/blocks/last',API+'/blocks/'+eventHeight
      ],block_hash:chainBlock.block_hash,tip_height:tipHeight,confirmations,minimum_confirmations:minConfirmations,
      checked_at:at,operator_review_reference:intent.approval.review_reference,
      issuer_wallet_signature_verified_by_crown:false,external_indexer_ingestion_verified:false
    },
    required_next_checks:['Publish approved metadata at canonical URL without redirect','Read back JSON content','Verify TokenScan enrichment independently']
  };
}
