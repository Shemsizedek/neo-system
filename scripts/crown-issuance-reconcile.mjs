// NCC-013 bounded, deterministic staging reconciliation. Run under an authorized GitHub Actions identity.
// This job stages reviewed bytes before signing. It cannot issue, sign, deploy, or bypass canonical checks.
import {readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadApprovedIntent,stageApprovedMetadata,verifyCanonicalBeforeSigning,confirmAndRecordIssuance} from '../server/crown-metadata/issuance-publication.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const names=await readdir(resolve(root,'server/crown-metadata/approved-intents'));
const assets=names.filter(x=>/^[A-Z][A-Z0-9]{0,23}\.json$/.test(x)).map(x=>x.slice(0,-5)).sort();
if(assets.length>30)throw Error('too_many_approved_intents_for_one_run');
const mode=process.argv[2]||'--prepare-all';
if(!['--prepare-all','--verify-all','--confirm-all'].includes(mode))throw Error('unknown_issuance_reconciliation_mode');
const outcomes=[];let failed=0,pending=0;
for(const asset of assets){
  try{
    const intent=await loadApprovedIntent(asset,{root});
    if(mode==='--prepare-all'){
      const result=await stageApprovedMetadata(intent,{root});
      outcomes.push({asset,result:result.state,phase:'METADATA_STAGED_IN_REPOSITORY',deploy_required:true});
    }else if(mode==='--verify-all'){
      const result=await verifyCanonicalBeforeSigning(intent);
      outcomes.push({asset,result:result.status,canonical_url:result.canonical_url});
    }else{
      if(!intent.tx_hash){pending++;outcomes.push({asset,result:'AWAITING_SIGNED_TRANSACTION'});continue;}
      const result=await confirmAndRecordIssuance(intent,{root});
      outcomes.push({asset,result:result.state,phase:result.stage,receipt_tx_hash:result.receipt.tx_hash});
    }
  }catch(error){
    const reason=error instanceof Error?error.message:'unknown_error';
    if(mode==='--confirm-all'&&reason==='insufficient_confirmations'){
      pending++;outcomes.push({asset,result:'AWAITING_CONFIRMATIONS'});
    }else{
      failed++;outcomes.push({asset,result:'BLOCKED',reason});
    }
  }
}
console.log(JSON.stringify({schema:'neo.crown.issuance-reconciliation-run.v1',mode,total:assets.length,failed,pending,outcomes}));
if(failed)process.exitCode=1;
