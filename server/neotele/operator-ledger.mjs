// NTEL-009 pure operator ledger — figures are evidence-linked proposals, not payments.
export function summarizeNeoTeleFunding({entries=[],pilotLines=0}={}) {
 if(!Number.isSafeInteger(pilotLines)||pilotLines<0) throw Error('invalid_pilot_lines');
 let commitments=0,obligations=0;
 const seen=new Set();
 for(const e of entries){
  if(!e||typeof e.id!=='string'||!e.id||seen.has(e.id)) throw Error('invalid_or_duplicate_ledger_entry');
  seen.add(e.id);
  if(!['COMMITMENT','OBLIGATION'].includes(e.type)||!Number.isSafeInteger(e.amountCents)||e.amountCents<0) throw Error('invalid_ledger_amount');
  if(typeof e.evidenceRef!=='string'||!e.evidenceRef) throw Error('ledger_evidence_required');
  if(e.type==='COMMITMENT') commitments+=e.amountCents;else obligations+=e.amountCents;
 }
 if(!Number.isSafeInteger(commitments)||!Number.isSafeInteger(obligations)) throw Error('ledger_overflow');
 return Object.freeze({pilotLines,monthlyCommitmentCents:commitments,monthlyObligationCents:obligations,
  monthlyGapCents:Math.max(obligations-commitments,0),provisioningEnabled:false,
  note:'Unverified commitments are not proof of deposited funds.'});
}
