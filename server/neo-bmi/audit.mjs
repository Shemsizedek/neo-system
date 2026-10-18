// Append-only SQL schema. Must be applied to a dedicated private PostgreSQL database.
export const schema = `
CREATE TABLE IF NOT EXISTS bmi_evidence_audit (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 operator_id TEXT NOT NULL,
 asset_id TEXT NOT NULL,
 bitcoin_txid CHAR(64) NOT NULL,
 status TEXT NOT NULL,
 block_hash CHAR(64),
 evidence_json JSONB NOT NULL,
 previous_hash CHAR(64),
 event_hash CHAR(64) NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS bmi_evidence_audit_asset_idx ON bmi_evidence_audit(asset_id, occurred_at DESC);
REVOKE UPDATE, DELETE, TRUNCATE ON bmi_evidence_audit FROM PUBLIC;
`;
import {createHash} from 'node:crypto';
export function makeAuditEvent({operatorId,assetId,txid,evidence,previousHash=null,occurredAt}){
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(operatorId||'')||!/^[A-Z0-9._-]{1,64}$/.test(assetId||'')||!/^[a-f0-9]{64}$/i.test(txid||''))throw Error('invalid audit identifiers');
 if(previousHash!==null&&!/^[a-f0-9]{64}$/i.test(previousHash))throw Error('invalid prior hash');
 const record={operatorId,assetId,txid:txid.toLowerCase(),status:evidence?.status||'NOT_VERIFIED',blockHash:evidence?.blockhash||null,evidence,previousHash,occurredAt:occurredAt||new Date().toISOString()};
 return {...record,eventHash:createHash('sha256').update(JSON.stringify(record)).digest('hex')};
}
export async function appendEvidenceAudit(client,event){
 // Database privilege to INSERT ONLY should be granted to the runtime role.
 await client.query('INSERT INTO bmi_evidence_audit(operator_id,asset_id,bitcoin_txid,status,block_hash,evidence_json,previous_hash,event_hash,occurred_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)',[event.operatorId,event.assetId,event.txid,event.status,event.blockHash,JSON.stringify(event.evidence),event.previousHash,event.eventHash,event.occurredAt]);
}
