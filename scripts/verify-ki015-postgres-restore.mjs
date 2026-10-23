import assert from 'node:assert/strict';
import { createKnowindexPostgresLedger } from '../server/neo-knowindex/postgres-ledger.mjs';

const candidate = process.env.KNOWINDEX_PG_RESTORE_URL || '';
let location;
try { location = new URL(candidate); } catch { throw new Error('test_restore_connection_required'); }
assert.equal(location.pathname, '/knowindex_ci_restore', 'Refusing to inspect non-test database');
const { Pool } = await import('pg');
const pool = new Pool({ connectionString: candidate, max: 2 });
try {
  const ledger = createKnowindexPostgresLedger({ pool });
  assert.equal(await ledger.checkSchema(), true, 'restored schema missing');
  const result = await ledger.verifyAuditChain();
  assert.equal(result.valid, true, 'restored audit is corrupt');
  assert.equal(result.checked, 11, 'unexpected restored event count');
  const rows = await ledger.list({ subject: 'google:ci-curator', role: 'curator', neopassStatus: 'active' }, { state: 'removed' });
  assert.equal(rows.length, 1, 'withdrawal did not survive restore');
  console.log(JSON.stringify({
    restoreStatus: 'PASS',
    records: (await pool.query('SELECT count(*)::integer AS total FROM knowindex.contributions')).rows[0].total,
    auditEvents: result.checked,
    auditHeadSha256: result.headHash,
    verifiedWithdrawal: true,
    publicationEnabled: false
  }));
} finally {
  await pool.end();
}
