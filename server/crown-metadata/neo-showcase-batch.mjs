// NCC-017 bounded staging executor: only operator-reviewed initial-issuance intents.
// Actual writes occur only when caller chooses --stage-confirmed and all checks pass.
import {readdir} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadApprovedIntent} from './issuance-publication.mjs';
import {observeApprovedCrownCreation} from './neo-issuance-event-observer.mjs';
import {stageConfirmedNeoShowcase} from './neo-issuance-showcase-publisher.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const INTENTS=/^[A-Z][A-Z0-9]{0,23}\.json$/;
const PENDING=new Set(['insufficient_confirmations','creation_not_observed']);

/**
 * Runs on GitHub's protected staging branch. Does not accept webhooks from clients.
 * An approved file is an operational allowlist, not cryptographic reviewer identity.
 */
export async function runNeoShowcaseBatch({
  root=ROOT,fetchImpl=fetch,clock=()=>new Date(),mode='inspect',minConfirmations=6
}={}){
  if(!['inspect','stage-confirmed'].includes(mode))throw Error('unsupported_neo_showcase_batch_mode');
  const approvedDir=join(root,'server/crown-metadata/approved-intents');
  const filenames=(await readdir(approvedDir)).filter(name=>INTENTS.test(name)).sort();
  if(filenames.length>30)throw Error('approved_asset_limit_exceeded');
  let confirmed=0,pending=0,blocked=0,changed=0;
  const results=[];
  for(const filename of filenames){
    const asset=filename.slice(0,-5);
    try{
      const intent=await loadApprovedIntent(asset,{root});
      const result=mode==='inspect'
        ?await observeApprovedCrownCreation(intent,{fetchImpl})
        :await stageConfirmedNeoShowcase(intent,{root,fetchImpl,clock,minConfirmations});
      if(result.status==='pending'||result.stage==='AWAITING_AUTHORIZED_CREATION_EVENT'){
        pending++;
        results.push({asset,state:'PENDING_CREATION_EVENT',written:false});
      }else if(mode==='inspect'){
        pending++;
        results.push({asset,state:'CREATION_SEEN_REQUIRES_CONFIRMATIONS',written:false,tx_hash:result.observation.tx_hash});
      }else{
        confirmed++;
        if(result.written)changed++;
        results.push({
          asset,state:result.stage,written:result.written,
          chain_confirmation_source:'counterparty_core_v2',
          tx_hash:result.receipt_tx_hash,
          no_signing:true,canonical_metadata_brand:'NEO canonical metadata'
        });
      }
    }catch(error){
      const reason=error instanceof Error?error.message:'unknown_error';
      if(PENDING.has(reason)){
        pending++;results.push({asset,state:'AWAITING_CONFIRMATIONS_OR_CREATION',written:false});
      }else{
        blocked++;results.push({asset,state:'BLOCKED',written:false,error:reason});
      }
    }
  }
  return {
    schema:'NEO-CROWN-AUTO-SHOWCASE-BATCH-V1',mode,assets_reviewed:filenames.length,
    confirmed,pending,blocked,changed,
    all_approved_issuances_confirmed:filenames.length>0&&confirmed===filenames.length,
    public_hosting_verified:false,signing_performed:false,
    result:filenames.length===0?'NO_APPROVED_ISSUANCE_INTENTS':blocked?'BLOCKED_SOME_ASSETS':confirmed?'CONFIRMED_FILES_STAGED':'AWAITING_VERIFIED_CREATION',
    results
  };
}
