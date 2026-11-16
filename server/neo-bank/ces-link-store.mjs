// Persistent CES identifier-only links. This module never performs transfers,
// reads balances, grants account permissions, or handles CES credentials.
import {attestCesAccountLink} from './ces-links.mjs';

const minProofAgeMs = 5 * 60 * 1000;
const maxClockSkewMs = 60 * 1000;
const subjectPattern = /^[a-zA-Z0-9:._-]{6,160}$/;

export async function migrateNeoBankCesLinkStore(pool) {
  if (!pool?.query) throw new Error('postgres_pool_required');
  // Application identity must exist before a link can be persisted.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS neo_bank_ces_links (
      neo_subject text NOT NULL REFERENCES neo_bank_accounts(subject) ON DELETE RESTRICT,
      exchange_id text NOT NULL,
      external_account text NOT NULL,
      status text NOT NULL DEFAULT 'verified_identifier_only'
        CHECK (status = 'verified_identifier_only'),
      verified_at timestamptz NOT NULL,
      verification_source text NOT NULL DEFAULT 'authorized_ces_server'
        CHECK (verification_source = 'authorized_ces_server'),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(exchange_id, external_account),
      UNIQUE(neo_subject, exchange_id, external_account)
    );
    CREATE INDEX IF NOT EXISTS neo_bank_ces_links_subject_idx
      ON neo_bank_ces_links(neo_subject, exchange_id);
  `);
}

export function createNeoBankCesLinkStore({pool,verifyCesOwnership,now=()=>Date.now()}={}) {
  if (!pool?.query) throw new Error('postgres_pool_required');

  return {
    async verifyAndPersist(pending,evidence) {
      // An upstream administrator login is insufficient: proof must identify
      // BOTH the NEO subject and specific external exchange account.
      if (typeof verifyCesOwnership !== 'function') {
        throw new Error('trusted_ces_verification_required');
      }
      const link = await attestCesAccountLink(pending,evidence,{verifyCesOwnership});
      const ageMs = now() - Date.parse(link.verifiedAt);
      if (!Number.isFinite(ageMs) || ageMs > minProofAgeMs || ageMs < -maxClockSkewMs) {
        throw new Error('ces_account_proof_expired');
      }
      const {rows} = await pool.query(`
        INSERT INTO neo_bank_ces_links
          (neo_subject,exchange_id,external_account,status,verified_at,verification_source)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (exchange_id,external_account) DO UPDATE
          SET verified_at=EXCLUDED.verified_at,
              updated_at=now()
        WHERE neo_bank_ces_links.neo_subject=EXCLUDED.neo_subject
          AND neo_bank_ces_links.verified_at <= EXCLUDED.verified_at
        RETURNING neo_subject,exchange_id,external_account,status,verified_at,verification_source
      `,[
        link.neoSubject,link.exchangeId,link.externalAccount,
        'verified_identifier_only',link.verifiedAt,link.verificationSource
      ]);
      if (!rows?.length) throw new Error('ces_link_conflict_or_stale_proof');
      const row = rows[0];
      return {
        neoSubject:row.neo_subject,exchangeId:row.exchange_id,
        externalAccount:row.external_account,status:row.status,
        verifiedAt:new Date(row.verified_at).toISOString(),
        // A link cannot grant account access, balance reads or funds movement.
        permissions:{read:false,transfer:false,issuance:false}
      };
    },
    async linksForSubject(neoSubject) {
      if (!subjectPattern.test(String(neoSubject||''))) throw new Error('invalid_neo_subject');
      // Caller must have already authenticated the subject. Not a public route.
      const {rows}=await pool.query(`
        SELECT exchange_id,external_account,status,verified_at
        FROM neo_bank_ces_links WHERE neo_subject=$1
        ORDER BY exchange_id,external_account
      `,[neoSubject]);
      return (rows||[]).map(row=>({
        exchangeId:row.exchange_id,externalAccount:row.external_account,
        status:row.status,verifiedAt:new Date(row.verified_at).toISOString(),
        permissions:{read:false,transfer:false,issuance:false}
      }));
    }
  };
}
