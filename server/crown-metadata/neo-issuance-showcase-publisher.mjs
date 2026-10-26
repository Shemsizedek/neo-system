// NCC-017: approved NEO Crown issuance -> immutable Layer 3 public showcase assets.
// Source-attributed Counterparty verification is read-only. No signer, wallet, or issuer webhooks.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateApprovedIntent} from './issuance-reconciler.mjs';
import {observeApprovedCrownCreation} from './neo-issuance-event-observer.mjs';
import {confirmAndRecordIssuance} from './issuance-publication.mjs';
import {createLayer3Observed,LAYER3_STYLES} from './layer3-showcase.mjs';
import {GENRES,canonicalJson} from './investment-card-engine.mjs';
import {renderLayer3Svg} from './layer3-artwork.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const HASH=/^[a-f0-9]{64}$/i;
const format=value=>JSON.stringify(value,null,2)+'\n';
const checksum=value=>createHash('sha256').update(value,'utf8').digest('hex');

function assertShowcasePolicy(intent){
  validateApprovedIntent(intent,{requireTransaction:false});
  const policy=intent.showcase??{};
  if(!policy||typeof policy!=='object'||Array.isArray(policy))throw Error('invalid_showcase_approval');
  const fields=Object.keys(policy);
  if(fields.some(field=>!['instrument_type','style','public_title'].includes(field)))throw Error('unsupported_showcase_approval_field');
  const instrumentType=policy.instrument_type??'unclassified';
  const style=policy.style??'auto';
  if(!Object.hasOwn(GENRES,instrumentType))throw Error('invalid_approved_instrument_category');
  if(!LAYER3_STYLES.includes(style))throw Error('invalid_approved_card_finish');
  let publicTitle=policy.public_title??null;
  if(publicTitle!==null){
    if(typeof publicTitle!=='string'||publicTitle.length>64||publicTitle!==publicTitle.trim()||
       !/^[A-Za-z0-9][A-Za-z0-9 .,'&()/-]{0,63}$/.test(publicTitle))throw Error('invalid_public_showcase_title');
  }
  // A public insurance card must not expose policyholder/claimant names even when declared.
  if(['insurance_claim','insurance_policy'].includes(instrumentType))publicTitle=null;
  return {instrumentType,style,publicTitle};
}
function validateSnapshot(data,intent){
  if(!data||data.asset!==intent.asset||data.owner!==intent.owner_address||data.issuer!==intent.issuer_address)
    throw Error('verified_ledger_asset_or_owner_mismatch');
  if(typeof data.supply!=='string'||!/^\d+$/.test(data.supply)||BigInt(data.supply)!==BigInt(intent.quantity_raw))
    throw Error('current_supply_exceeds_approved_initial_issuance');
  if(typeof data.divisible!=='boolean'||typeof data.locked!=='boolean')throw Error('verified_ledger_fields_incomplete');
  if(data.description!==intent.asset_description_for_signer)throw Error('not_neo_canonical_description');
  return data;
}
async function existingOrNull(path){
  try{return await readFile(path,'utf8');}
  catch(error){if(error?.code==='ENOENT')return null;throw error;}
}
async function stageNoOverwrite(root,asset,items){
  const directory=join(root,'apps','neoscan','web','cardmaster','assets',asset);
  // Check every existing destination before writing any card so later conflicts can't
  // quietly replace an earlier confirmed asset's identity or issuer rights claim.
  const states={};
  for(const [name,value] of Object.entries(items)){
    const current=await existingOrNull(join(directory,name));
    if(current!==null&&current!==value)throw Error('existing_confirmed_showcase_conflict_requires_review');
    states[name]=current===null?'pending_write':'unchanged';
  }
  await mkdir(directory,{recursive:true});
  for(const [name,value] of Object.entries(items)){
    if(states[name]!=='pending_write')continue;
    try{await writeFile(join(directory,name),value,{encoding:'utf8',flag:'wx'});states[name]='created';}
    catch(error){
      if(error?.code!=='EEXIST')throw error;
      const current=await readFile(join(directory,name),'utf8');
      if(current!==value)throw Error('concurrent_showcase_publication_conflict');
      states[name]='unchanged';
    }
  }
  return states;
}

/**
 * Detect a newly created asset from Counterparty only if approved in GitHub.
 * Confirm the event and unchanged NEO canonical metadata, then stage immutable
 * showcase JSON/SVG/manifest files into the local static-site worktree.
 * This function never claims deployment or external explorer ingestion.
 */
export async function stageConfirmedNeoShowcase(intent,{
  root=ROOT,fetchImpl=fetch,clock=()=>new Date(),minConfirmations=6
}={}){
  const policy=assertShowcasePolicy(intent);
  const observation=await observeApprovedCrownCreation(intent,{fetchImpl});
  if(observation.status==='pending'){
    return {asset:intent.asset,stage:'AWAITING_AUTHORIZED_CREATION_EVENT',written:false,reason:observation.reason};
  }
  const confirmed=await confirmAndRecordIssuance(observation.intent_with_observed_tx,{
    root,fetchImpl,clock,minConfirmations
  });
  const chain=validateSnapshot(confirmed.verified_ledger_snapshot,intent);
  const receipt=confirmed.receipt;
  if(receipt.asset!==intent.asset||receipt.tx_hash!==observation.observation.tx_hash||
      !HASH.test(receipt.chain_block_hash)||!Number.isSafeInteger(receipt.block_index)||
      receipt.public_metadata_confirmed!==true||receipt.third_party_explorer_visibility_confirmed!==false)
    throw Error('issuance_receipt_not_publishable');

  // The designation is an operator-approved issuer *declaration*, not a legal opinion.
  const metadata={
    instrument_type:policy.instrumentType,
    description:intent.metadata.description,
    ...(policy.publicTitle?{card_data:{primary_title:policy.publicTitle}}:{})
  };
  const resolved={
    ledger:{
      asset:chain.asset,asset_longname:chain.asset_longname,owner:chain.owner,issuer:chain.issuer,
      supply:chain.supply,divisible:chain.divisible,locked:chain.locked,description:chain.description
    },
    observed_at:receipt.checked_at,metadata,media:{items:[]},
    metadata_status:'OPERATOR_APPROVED_ISSUER_DECLARATION',
    metadata_url:intent.asset_description_for_signer,
    metadata_sha256:receipt.metadata_sha256
  };
  const built=createLayer3Observed({asset:intent.asset,style:policy.style},resolved);
  if(built.payload.classification.type!==policy.instrumentType)
    throw Error('declared_instrument_type_not_reflected');
  const payload={
    ...built.payload,
    provenance:{
      ...built.payload.provenance,
      issuance_transaction_verified:true,
      issuance_event:'creation',
      issuance_tx_hash:receipt.tx_hash,
      first_issuance_block:receipt.block_index,
      first_issuance_block_hash:receipt.chain_block_hash,
      counterparty_confirmations_at_check:receipt.confirmations_at_check,
      canonical_metadata_verified_at:receipt.checked_at,
      counterparty_event_source:'https://api.counterparty.io:4000/v2/assets/'+intent.asset+'/issuances',
      instrument_classification_source:'OPERATOR_APPROVED_ISSUER_DECLARATION',
      legal_classification_verified:false,
      issuer_wallet_control_verified:false,
      bitcoin_full_node_consensus_verified:false,
      third_party_explorer_enrichment_verified:false
    }
  };
  const integrity={
    ...built.integrity,
    sha256:checksum(canonicalJson(payload)),
    blockchain_anchor_verified:false,
    issuer_signature_verified:false
  };
  const record={
    payload,integrity,read_only:true,automatically_staged_after_creation:true,
    public_hosting_verified:false,explorer_enrichment_verified:false,
    onchain_operation_performed:false,
    technical_asset_identifier:intent.asset
  };
  const front=renderLayer3Svg(record,{face:'front'});
  const back=renderLayer3Svg(record,{face:'back'});
  const manifest={
    schema:'NEO-CROWN-LAYER3-AUTO-PUBLICATION-V1',
    brand:'NEO',canonical_metadata_brand:'NEO canonical metadata',
    asset_code:intent.asset,
    status:'CHAIN_CONFIRMED_AWAITING_PUBLIC_HOST_READBACK',
    issuance_transaction:receipt.tx_hash,
    issuance_block:receipt.block_index,
    creation_event_verified_from:'counterparty_core_v2',
    stage_source:'approved_issuance_intent_plus_verified_creation',
    card_id:payload.card_id,
    files:{
      record:'showcase.json',front:'showcase-front.svg',back:'showcase-back.svg'
    },
    hashes:{
      record_sha256:checksum(format(record)),
      front_sha256:checksum(front),
      back_sha256:checksum(back)
    },
    third_party_explorer_enrichment_verified:false,
    full_bitcoin_node_verification:false,
    confirms_wallet_control:false,
    no_onchain_operation:true
  };
  const files={
    'showcase.json':format(record),
    'showcase-front.svg':front,
    'showcase-back.svg':back,
    'showcase-manifest.json':format(manifest)
  };
  const states=await stageNoOverwrite(root,intent.asset,files);
  return {
    asset:intent.asset,brand:'NEO',stage:'CHAIN_CONFIRMED_FILES_STAGED',written:Object.values(states).some(v=>v==='created'),
    states,card_id:payload.card_id,record_sha256:manifest.hashes.record_sha256,
    receipt_tx_hash:receipt.tx_hash,
    files:Object.keys(files).map(name=>'apps/neoscan/web/cardmaster/assets/'+intent.asset+'/'+name),
    public_hosting_verified:false,explorer_enrichment_verified:false,
    no_issuance_performed:true
  };
}
