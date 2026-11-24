import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {migrateSyntheticLedger,postSyntheticJournal} from './baas-ledger.mjs';

const url=process.env.NEO_BAAS_TEST_DATABASE_URL;
const pool=url?new pg.Pool({connectionString:url,max:8}):null;
const tenant='tenant_'+randomUUID().replaceAll('-','').slice(0,20);
const other='tenant_'+randomUUID().replaceAll('-','').slice(0,20);
const actor={authenticated:true,tenantId:tenant,scopes:['ledger:simulate']};
const request=(key='test_request_0000001')=>({
  actor,tenantId:tenant,debitAccount:'asset_cash',creditAccount:'customer_liability',
  currency:'USD',amountMinor:'2201',idempotencyKey:key
});
test('PostgreSQL atomic synthetic journal, tenant isolation, idempotency and rollback',
 {skip:!pool},async()=>{
  try {
    await migrateSyntheticLedger(pool);
    for(const t of [tenant,other])
      for(const a of ['asset_cash','customer_liability'])
        await pool.query('INSERT INTO baas_sim_accounts(tenant_id,account_id,currency) VALUES($1,$2,$3)',
          [t,a,'USD']);
    const results=await Promise.all(Array.from({length:12},()=>postSyntheticJournal(pool,request())));
    assert.equal(new Set(results.map(r=>r.journalId)).size,1);
    assert.equal(results.filter(r=>r.replayed===false).length,1);
    const rows=await pool.query('SELECT direction,amount_minor FROM baas_sim_lines WHERE journal_id=$1',
      [results[0].journalId]);
    assert.equal(rows.rows.length,2);
    assert.deepEqual(rows.rows.map(r=>r.direction).sort(),['credit','debit']);
    assert.equal(rows.rows[0].amount_minor,'2201');
    await assert.rejects(postSyntheticJournal(pool,{...request(),amountMinor:'2202'}),
      /idempotency_payload_conflict/);
    await assert.rejects(postSyntheticJournal(pool,{...request('test_request_0000002'),creditAccount:'missing_account'}),
      /tenant_account_not_found/);
    const missing=await pool.query('SELECT count(*)::int AS n FROM baas_sim_journals WHERE tenant_id=$1 AND idempotency_key=$2',
      [tenant,'test_request_0000002']);
    assert.equal(missing.rows[0].n,0);
    await assert.rejects(postSyntheticJournal(pool,{...request('test_request_0000003'),actor:{...actor,tenantId:other}}),
      /tenant_authorization_required/);
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const jid=randomUUID();
      await client.query('INSERT INTO baas_sim_journals(id,tenant_id,currency,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5)',
        [jid,tenant,'USD','test_request_unbalanced','0'.repeat(64)]);
      await client.query('INSERT INTO baas_sim_lines(journal_id,tenant_id,currency,account_id,direction,amount_minor) VALUES($1,$2,$3,$4,$5,$6)',
        [jid,tenant,'USD','asset_cash','debit','100']);
      await client.query('INSERT INTO baas_sim_lines(journal_id,tenant_id,currency,account_id,direction,amount_minor) VALUES($1,$2,$3,$4,$5,$6)',
        [jid,tenant,'USD','customer_liability','credit','99']);
      await assert.rejects(client.query('COMMIT'),/unbalanced_synthetic_journal/);
      await client.query('ROLLBACK');
    }finally{client.release()}
  }finally{
    for(const t of [tenant,other]){
      await pool.query('DELETE FROM baas_sim_lines WHERE tenant_id=$1',[t]);
      await pool.query('DELETE FROM baas_sim_journals WHERE tenant_id=$1',[t]);
      await pool.query('DELETE FROM baas_sim_accounts WHERE tenant_id=$1',[t]);
    }
    await pool.end();
  }
});
