// PostgreSQL persistence contract, review-only. No connection is opened until
// the caller supplies a pool; no migration is performed by this module.
export function createPostgresNeoKeyStore(pool) {
  if (typeof pool?.connect !== 'function' || typeof pool?.query !== 'function') {
    throw new Error('neo_key_postgres_pool_required');
  }
  async function transaction(work) {
    const client = await pool.connect();
    let inTransaction = false;
    try {
      await client.query('BEGIN'); inTransaction = true;
      const result = await work(client);
      await client.query('COMMIT'); inTransaction = false;
      return result;
    } catch (error) {
      if (inTransaction) await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  // Locks serialize key enrollment / revocation for one subject even when
  // workers and DB connections are distinct.
  const lockOwner = (client, subject) => client.query(
    'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))', [subject]);
  return Object.freeze({
    async getOrCreateUserHandle(subject, generatedHandle) {
      await pool.query('INSERT INTO neo_key_subjects(subject_id,user_handle) VALUES($1,$2) ON CONFLICT(subject_id) DO NOTHING',
        [subject, generatedHandle]);
      const result = await pool.query('SELECT user_handle FROM neo_key_subjects WHERE subject_id=$1', [subject]);
      return result.rows[0]?.user_handle ?? null;
    },
    async insertRegistrationChallenge(data) {
      await pool.query(`INSERT INTO neo_key_registration_challenges
        (challenge_hash,subject_id,rp_id,origin,expires_at,enrollment_method,authorization_ref)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [data.challengeHash,data.subject,data.rpId,data.origin,data.expiresAt,data.method,data.authorizationRef]);
    },
    async registerAtomic(data) {
      return transaction(async client => {
        await lockOwner(client,data.subject);
        const consumed = await client.query(`UPDATE neo_key_registration_challenges
          SET consumed_at=$6 WHERE challenge_hash=$1 AND subject_id=$2 AND rp_id=$3
          AND origin=$4 AND expires_at>$5 AND consumed_at IS NULL
          RETURNING enrollment_method,authorization_ref`,
          [data.challengeHash,data.subject,data.rpId,data.origin,data.now,data.now]);
        if (consumed.rows.length !== 1) return false;
        // Under the owner-scoped lock, enforce first-key bootstrap and
        // distinguish later authorized passkey additions.
        const enrolled = await client.query(`SELECT COUNT(*)::int AS count
          FROM neo_key_credentials WHERE subject_id=$1 AND rp_id=$2
          AND revoked_at IS NULL`, [data.subject,data.rpId]);
        const existing = Number(enrolled.rows[0]?.count);
        const enrollmentMethod = consumed.rows[0]?.enrollment_method;
        if (!Number.isSafeInteger(existing) || existing < 0 ||
            (existing === 0 && enrollmentMethod !== 'verified-operator-bootstrap') ||
            (existing > 0 && enrollmentMethod !== 'verified-existing-passkey')) return false;
        if (existing === 0) {
          // Atomic, one-use dual-control authorization; a signed client
          // endorsement alone is not a consumable credential-issuance right.
          const approval=await client.query(`UPDATE neo_key_bootstrap_approvals
            SET consumed_at=$6 WHERE authorization_ref=$1
              AND subject_id=$2 AND rp_id=$3 AND origin=$4
              AND expires_at>$5 AND consumed_at IS NULL
              AND approver_one<>approver_two
            RETURNING authorization_ref`,
            [consumed.rows[0].authorization_ref,data.subject,data.rpId,data.origin,data.now,data.now]);
          if(approval.rows.length!==1) return false;
        }
        const result = await client.query(`INSERT INTO neo_key_credentials
          (credential_id,subject_id,rp_id,public_key_pem,public_key_cose,sign_count,created_at)
          VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(credential_id) DO NOTHING
          RETURNING credential_id`,
          [data.credentialId,data.subject,data.rpId,data.publicKeyPem,data.publicKeyCose,data.signCount,data.now]);
        if (result.rows.length !== 1) {
          // Raise to roll back consumed challenge too. A retry may then be
          // explicitly rejected by the duplicate credential constraint.
          throw new Error('neo_key_duplicate_credential');
        }
        await client.query(`INSERT INTO neo_key_audit_events
          (subject_id,credential_id,event_type,created_at)
          VALUES($1,$2,'enrolled',$3)`,[data.subject,data.credentialId,data.now]);
        return true;
      });
    },
    async revokeAtomic(data) {
      if (data.targetCredentialId === data.backupCredentialId) return false;
      return transaction(async client => {
        await lockOwner(client,data.subject);
        const active = await client.query(`SELECT credential_id FROM neo_key_credentials
          WHERE subject_id=$1 AND rp_id=$2 AND revoked_at IS NULL FOR UPDATE`,
          [data.subject,data.rpId]);
        const ids = new Set(active.rows.map(x=>x.credential_id));
        if (ids.size < 2 || !ids.has(data.targetCredentialId) || !ids.has(data.backupCredentialId)) return false;
        const updated = await client.query(`UPDATE neo_key_credentials SET revoked_at=$4
          WHERE credential_id=$1 AND subject_id=$2 AND rp_id=$3 AND revoked_at IS NULL
          RETURNING credential_id`,
          [data.targetCredentialId,data.subject,data.rpId,data.now]);
        if (updated.rows.length !== 1) throw new Error('neo_key_revocation_race');
        await client.query(`INSERT INTO neo_key_audit_events
          (subject_id,credential_id,authorizing_credential_id,event_type,created_at)
          VALUES($1,$2,$3,'revoked',$4)`,
          [data.subject,data.targetCredentialId,data.backupCredentialId,data.now]);
        // A lost-key recovery must invalidate all existing NEO Key sessions;
        // this update is in the same transaction as key revocation and audit.
        // If it fails, the credential revocation MUST also roll back.
        await client.query(`UPDATE neo_key_staging_sessions
          SET revoked_at=$2 WHERE subject_id=$1 AND revoked_at IS NULL`,
          [data.subject,Math.floor(data.now/1000)]);
        return true;
      });
    }
  });
}
