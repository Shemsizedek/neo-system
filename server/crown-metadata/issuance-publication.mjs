// NCC-013 two-phase Crown issuer metadata publication.
// PREPARE: approved static JSON before signing. CONFIRM: authoritative mainnet readback, never signs/broadcasts.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateApprovedIntent,independentlyReconcileCrownIssuance} from './issuance-reconciler.mjs';
import {validateLegacyEnhancedJSON} from './issuance-autopublish.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ASSET=/^[A-Z][A-Z0-9]{0,23}$/;
const digest=text=>createHash('sha256').update(text,'utf8').digest('hex');
const format=obj=>JSON.stringify(obj,null,2)+'\n';
const metadataPath=(root,asset)=>join(root,'apps','neoscan','web','cardmaster','assets',asset,'tokenscan.json');
const receiptPath=(root,asset)=>join(root,'server','crown-metadata','issuance-receipts',asset+'.json');

async function writeOnce(path,content){
  await mkdir(dirname(path),{recursive:true});
  try{await writeFile(path,content,{encoding:'utf8',flag:'wx'});return 'created';}
  catch(error){
    if(error.code!=='EEXIST')throw error;
    const previous=await readFile(path,'utf8');
    if(previous!==content)throw Error('existing_publication_conflict_manual_review_required');
    return 'unchanged';
  }
}
async function writeReceiptOnce(path,record){
  await mkdir(dirname(path),{recursive:true});
  try{await writeFile(path,format(record),{encoding:'utf8',flag:'wx'});return 'created';}
  catch(error){
    if(error.code!=='EEXIST')throw error;
    const existing=JSON.parse(await readFile(path,'utf8'));
    const fields=['schema','asset','tx_hash','block_index','chain_block_hash','source_address','canonical_url','metadata_sha256','operator_review_reference'];
    if(fields.some(field=>existing[field]!==record[field]))throw Error('existing_receipt_conflict_or_reorganization');
    return 'unchanged';
  }
}
export async function loadApprovedIntent(asset,{root=ROOT}={}){
  if(typeof asset!=='string'||!ASSET.test(asset))throw Error('invalid_approved_intent_name');
  const full=join(root,'server','crown-metadata','approved-intents',asset+'.json');
  const bytes=await readFile(full);
  if(bytes.length>16384)throw Error('approved_intent_too_large');
  const intent=JSON.parse(bytes.toString('utf8'));
  if(intent.asset!==asset)throw Error('approved_intent_asset_mismatch');
  validateApprovedIntent(intent,{requireTransaction:false});
  return intent;
}
export function preparedMetadata(intent){
  const {prepared}=validateApprovedIntent(intent,{requireTransaction:false});
  const metadata=validateLegacyEnhancedJSON(prepared.metadata);
  return {
    stage:'OPERATOR_APPROVED_PRE_SIGN_METADATA',
    asset:prepared.asset,canonical_url:prepared.asset_description_for_signer,
    path:'apps/neoscan/web/cardmaster/assets/'+prepared.asset+'/tokenscan.json',
    metadata,content_sha256:digest(format(metadata)),
    chain_confirmation_verified:false,issuer_signature_verified:false,
    note:'This file must be deployed and verified at its canonical HTTPS URL before the wallet signs the issuance.'
  };
}
export async function stageApprovedMetadata(intent,{root=ROOT}={}){
  const item=preparedMetadata(intent);
  const state=await writeOnce(metadataPath(root,item.asset),format(item.metadata));
  return {...item,state};
}
async function readCanonical(url,fetchImpl){
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),6500);
  try{
    const response=await fetchImpl(url,{method:'GET',redirect:'error',signal:abort.signal,headers:{accept:'application/json','user-agent':'NEO-Crown-Canonical-Preflight/1.0'}});
    if(!response||response.status!==200||response.redirected||!response.headers?.get?.('content-type')?.toLowerCase().includes('application/json'))throw Error('canonical_metadata_http_or_redirect_failure');
    const size=Number(response.headers.get('content-length')||0);
    if(size>8192)throw Error('canonical_metadata_too_large');
    if(!response.body?.getReader)throw Error('canonical_stream_unavailable');
    const reader=response.body.getReader();let total=0;const chunks=[];
    while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>8192){await reader.cancel();throw Error('canonical_metadata_too_large');}chunks.push(value);}
    const buffer=new Uint8Array(total);let index=0;for(const chunk of chunks){buffer.set(chunk,index);index+=chunk.length;}
    return JSON.parse(new TextDecoder().decode(buffer));
  }finally{clearTimeout(timeout);}
}
export async function verifyCanonicalBeforeSigning(intent,{fetchImpl=fetch}={}){
  const expected=preparedMetadata(intent);
  const actual=validateLegacyEnhancedJSON(await readCanonical(expected.canonical_url,fetchImpl));
  const entries=o=>Object.entries(o).sort(([a],[b])=>a.localeCompare(b));
  if(JSON.stringify(entries(actual))!==JSON.stringify(entries(expected.metadata)))throw Error('canonical_content_does_not_match_approved_metadata');
  return {asset:expected.asset,canonical_url:expected.canonical_url,status:'CANONICAL_JSON_VERIFIED',redirect:false,source_matches_approved_metadata:true,metadata_sha256:expected.content_sha256};
}
export async function confirmAndRecordIssuance(intent,{root=ROOT,fetchImpl=fetch,clock=()=>new Date(),minConfirmations=6}={}){
  validateApprovedIntent(intent); // transaction hash must now exist
  const expected=preparedMetadata(intent);
  const staged=await readFile(metadataPath(root,expected.asset),'utf8');
  if(staged!==format(expected.metadata))throw Error('approved_metadata_not_staged_or_changed');
  // Checking canonical before spending confirmations ensures an unhosted domain cannot be marked published.
  const url=await verifyCanonicalBeforeSigning(intent,{fetchImpl});
  const receipt=await independentlyReconcileCrownIssuance(intent,{fetchImpl,clock,minConfirmations});
  const saved={
    schema:'neo.crown.confirmed-issuance-receipt.v1',
    asset:expected.asset,tx_hash:receipt.receipt.tx_hash,block_index:receipt.receipt.block_index,
    chain_block_hash:receipt.provenance.block_hash,confirmations_at_check:receipt.provenance.confirmations,
    source_address:intent.owner_address,canonical_url:expected.canonical_url,
    metadata_sha256:expected.content_sha256,checked_at:receipt.provenance.checked_at,
    api_source:'counterparty_core_v2',signer_receipt_authenticated:false,
    public_metadata_confirmed:true,third_party_explorer_visibility_confirmed:false,
    operator_review_reference:intent.approval.review_reference,
    issuer_wallet_control_verified_by_crown:false,
    no_token_operation_performed:true
  };
  const path=receiptPath(root,expected.asset);
  const state=await writeReceiptOnce(path,saved);
  // Preserve the first verification timestamp and immutable chain evidence across retry runs.
  const persisted=JSON.parse(await readFile(path,'utf8'));
  return {
    asset:expected.asset,stage:'CHAIN_CONFIRMED_AND_CANONICAL_VERIFIED',state,
    canonical_check:url,receipt:persisted,
    verified_ledger_snapshot:receipt.verified_ledger_snapshot,
    chain_provenance:receipt.provenance
  };
}
async function main(){
  const [mode,asset]=process.argv.slice(2);
  if(!['--prepare','--preflight','--confirm'].includes(mode)||!ASSET.test(asset||''))throw Error('usage: node issuance-publication.mjs --prepare|--preflight|--confirm ASSET');
  const intent=await loadApprovedIntent(asset);
  const result=mode==='--prepare'?await stageApprovedMetadata(intent):mode==='--preflight'?await verifyCanonicalBeforeSigning(intent):await confirmAndRecordIssuance(intent);
  console.log(JSON.stringify(result));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{console.error('NCC-013 publication blocked:',error instanceof Error?error.message:'unknown_error');process.exitCode=1;});
}
