// Project 144 / NEO–BAAS–003. Isolated PostgreSQL synthetic journal, NOT a banking provider.
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {planSyntheticJournal,validateBalancedJournal} from './baas-foundation.mjs';

export async function migrateSyntheticLedger(pool) {
  const path=fileURLToPath(new URL('./baas-ledger.sql',import.meta.url));
  await pool.query(await readFile(path,'utf8'));
}

export async function postSyntheticJournal(pool,input) {
  if (!pool?.connect) throw new Error('postgres_pool_required');
  const proposal=planSyntheticJournal(input);
  validateBalancedJournal(proposal);
  const {tenantId,currency,idempotencyKey,entries}=proposal;
  const hash=createHash('sha256').update(JSON.stringify({
    tenantId,currency,debitAccount:entries[0].accountId,
    creditAccount:entries[1].accountId,amountMinor:entries[0].amountMinor
  })).digest('hex');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    // Distinct requests with the same key serialize even when concurrent.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
      [tenantId+':'+idempotencyKey]);
    const previous=await client.query(
      'SELECT id,request_hash FROM baas_sim_journals WHERE tenant_id=$1 AND idempotency_key=$2',
      [tenantId,idempotencyKey]);
    if (previous.rows.length) {
      if(previous.rows[0].request_hash!==hash) throw new Error('idempotency_payload_conflict');
      await client.query('COMMIT');
      return {journalId:previous.rows[0].id,tenantId,currency,replayed:true,mode:'synthetic-only'};
    }
    const accounts=await client.query(
      'SELECT account_id FROM baas_sim_accounts WHERE tenant_id=$1 AND currency=$2 AND account_id=ANY($3::text[]) FOR SHARE',
      [tenantId,currency,entries.map(e=>e.accountId)]);
    if (accounts.rows.length!==2) throw new Error('tenant_account_not_found');
    const journalId=randomUUID();
    await client.query(
      'INSERT INTO baas_sim_journals(id,tenant_id,currency,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5)',
      [journalId,tenantId,currency,idempotencyKey,hash]);
    for(const line of entries) {
      await client.query(
        'INSERT INTO baas_sim_lines(journal_id,tenant_id,currency,account_id,direction,amount_minor) VALUES($1,$2,$3,$4,$5,$6)',
        [journalId,tenantId,currency,line.accountId,line.direction,line.amountMinor]);
    }
    // Deferred balancing trigger fires at COMMIT, before acknowledgment.
    await client.query('COMMIT');
    return {journalId,tenantId,currency,replayed:false,mode:'synthetic-only'};
  } catch(error) {
    try {await client.query('ROLLBACK')} catch {}
    throw error;
  } finally { client.release(); }
}
