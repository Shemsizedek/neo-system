// NEO-ACT-005: offline, read-only adapter envelope and privacy-safe dashboard projection.
import {createHash} from 'node:crypto';
import {reconcileRegister,reconcileJournal} from './register.mjs';
const SOURCES=new Set(['CES_EXPORT','COUNTERPARTY_EXPORT','CROWN_EVIDENCE_EXPORT','TREASURY_EXPORT']);
const sha=s=>createHash('sha256').update(s).digest('hex');
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
export function intakeEnvelope(envelope){
 if(!envelope||!SOURCES.has(envelope.source)||typeof envelope.batchId!=='string'||!envelope.batchId.trim()||!validDate(envelope.asOf))throw new TypeError('Source, batch ID and date required');
 if(envelope.readOnly!==true||envelope.authorizedExport!==true)throw new TypeError('Read-only authorized export required');
 if(!Array.isArray(envelope.records)||!Array.isArray(envelope.journal))throw new TypeError('Records and journal arrays required');
 if(envelope.records.length>10000||envelope.journal.length>20000)throw new RangeError('Batch size exceeded');
 // Stable identity, independent of export upload location. The output is not an authenticity signature.
 const seen=new Set();
 const records=envelope.records.map(r=>{
  if(!r||typeof r.id!=='string'||!r.id.trim())throw new TypeError('Record identifier required');
  const key=envelope.source+':'+envelope.batchId+':'+r.id;
  if(seen.has(key))throw new TypeError('Duplicate source record');
  seen.add(key);
  return {...r,id:key};
 });
 const journal=envelope.journal.map((r,i)=>({...r,id:envelope.source+':'+envelope.batchId+':journal:'+i}));
 const canonical=JSON.stringify({source:envelope.source,batchId:envelope.batchId,asOf:envelope.asOf,records:envelope.records,journal:envelope.journal});
 return {source:envelope.source,batchId:envelope.batchId,asOf:envelope.asOf,digestSha256:sha(canonical),records,journal,validation:'STRUCTURAL_ONLY',sourceAuthenticated:false};
}
export function buildRiskSnapshot(envelopes){
 if(!Array.isArray(envelopes)||!envelopes.length)throw new TypeError('Source batches required');
 const batchIds=new Set(),all=[],journals=[],digests=[];
 for(const raw of envelopes){
  const e=intakeEnvelope(raw),key=e.source+':'+e.batchId;
  if(batchIds.has(key))throw new TypeError('Duplicate batch');
  batchIds.add(key);all.push(...e.records);journals.push(...e.journal);digests.push({source:e.source,batchId:e.batchId,digestSha256:e.digestSha256});
 }
 const asOf=envelopes[0].asOf;
 if(envelopes.some(e=>e.asOf!==asOf))throw new TypeError('Snapshot dates must agree');
 const register=reconcileRegister({asOf,records:all});
 const checks=reconcileJournal({entries:journals});
 return {schema:'NEO-ACT-005',asOf,mode:'OFFLINE_READ_ONLY',
  eligibleBalances:register.classified,unverifiedRecordCount:register.pending.length,
  exceptionCounts:{unbalancedTransactions:checks.filter(c=>!c.balanced).length,unverifiedRecords:register.pending.length},
  sources:digests,security:{authenticated:false,signaturesVerified:false,externalBalancesVerified:false},
  status:'DRAFT_UNAUDITED_NOT_FOR_FINANCIAL_RELIANCE'};
}
