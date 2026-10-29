import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';

export const ARTWORK_SHA256='00472d01de84f4d876d7cd6ca1fa53a844a0b7929f93f97cd5dfb4c28e7bb7e6';
const EVIDENCE_KEYS=['network','asset','amount','artworkSha256','fundingTxHash','fundingEventIndex','fundingAddress','custodyPolicyRef','redemptionTermsRef'];
const REQUIRED_KEYS=EVIDENCE_KEYS;
const activationBlockers=['live_funding_verifier_not_connected','custody_and_funding_model_not_approved','authorized_signer_not_connected','redemption_and_double_spend_controls_not_verified'];
const identifier=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const fail=code=>{throw new Error(code);};

/** Internal draft-only store. No issuance, signing, token movement or redemption execution. */
export function createBillRegistry({filename,now=()=>new Date().toISOString(),serialFactory=()=>`NOMNI-1-${randomUUID()}`}={}){
  if(typeof filename!=='string'||!filename)fail('database_filename_required');
  const db=new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS nomni_bill_drafts (
      serial TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE,
      denomination TEXT NOT NULL CHECK(denomination='1'),
      status TEXT NOT NULL CHECK(status='DRAFT'), created_at TEXT NOT NULL,
      evidence TEXT NOT NULL DEFAULT '{}', funding_key TEXT UNIQUE);
  `);
  const read=serial=>{
    const row=db.prepare('SELECT * FROM nomni_bill_drafts WHERE serial=?').get(serial);
    if(!row)return null;
    return {serial:row.serial,requestId:row.request_id,denomination:row.denomination,asset:'NOMNI',network:'counterparty-mainnet',status:row.status,createdAt:row.created_at,evidence:JSON.parse(row.evidence),circulationEnabled:false,fundingVerified:false};
  };
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
  function reserveDraft({requestId,denomination='1'}={}){
    if(!identifier(requestId))fail('invalid_request_id');
    if(denomination!=='1')fail('only_one_nomni_denomination_supported');
    return transaction(()=>{
      const prior=db.prepare('SELECT serial FROM nomni_bill_drafts WHERE request_id=?').get(requestId);
      if(prior)return read(prior.serial);
      const serial=serialFactory();if(!identifier(serial))fail('invalid_serial');
      db.prepare("INSERT INTO nomni_bill_drafts(serial,request_id,denomination,status,created_at) VALUES(?,?,?,'DRAFT',?)").run(serial,requestId,denomination,now());
      return read(serial);
    });
  }
  function submitEvidence(serial,input){
    if(!input||typeof input!=='object'||Array.isArray(input))fail('invalid_evidence');
    if(Object.keys(input).some(key=>!EVIDENCE_KEYS.includes(key)))fail('unsupported_evidence_field');
    const evidence={};
    for(const key of Object.keys(input)){
      if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>256)fail('invalid_evidence_value');
      evidence[key]=input[key].trim();
    }
    if(evidence.network&&evidence.network!=='counterparty-mainnet')fail('wrong_network');
    if(evidence.asset&&evidence.asset!=='NOMNI')fail('wrong_asset');
    if(evidence.amount&&evidence.amount!=='1')fail('wrong_denomination');
    if(evidence.artworkSha256&&evidence.artworkSha256!==ARTWORK_SHA256)fail('artwork_mismatch');
    if(evidence.fundingTxHash&&!/^[a-f0-9]{64}$/.test(evidence.fundingTxHash))fail('invalid_funding_transaction');
    if(evidence.fundingEventIndex&&!/^(0|[1-9][0-9]{0,9})$/.test(evidence.fundingEventIndex))fail('invalid_funding_event_index');
    if(Boolean(evidence.fundingTxHash)!==Boolean(evidence.fundingEventIndex))fail('funding_transaction_and_event_required_together');
    const fundingKey=evidence.fundingTxHash?`${evidence.fundingTxHash}:${evidence.fundingEventIndex}`:null;
    return transaction(()=>{
      const existing=read(serial);if(!existing)fail('unknown_serial');
      // Reserve an event against a single draft. This is a duplicate-claim check, not proof of backing.
      if(fundingKey){const claim=db.prepare('SELECT serial FROM nomni_bill_drafts WHERE funding_key=?').get(fundingKey);if(claim&&claim.serial!==serial)fail('funding_evidence_already_claimed');}
      db.prepare('UPDATE nomni_bill_drafts SET evidence=?,funding_key=? WHERE serial=?').run(JSON.stringify(evidence),fundingKey,serial);
      return assessReadiness(serial);
    });
  }
  function assessReadiness(serial){
    const draft=read(serial);if(!draft)fail('unknown_serial');
    const missingEvidence=REQUIRED_KEYS.filter(key=>!draft.evidence[key]);
    return {...draft,evidenceStatus:missingEvidence.length?'INCOMPLETE':'SUBMITTED_UNVERIFIED',missingEvidence,blockers:[...missingEvidence.map(key=>`missing:${key}`),...activationBlockers],readyForCirculation:false};
  }
  function requestRedemption(){fail('circulation_disabled_redemption_unavailable');}
  return {reserveDraft,submitEvidence,assessReadiness,get:read,requestRedemption,close:()=>db.close()};
}
