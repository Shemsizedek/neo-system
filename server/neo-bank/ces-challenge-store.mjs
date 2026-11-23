// Dedicated PostgreSQL challenge store for signed CES account-ownership proofs.
// The migration is opt-in. It does not modify NEO Bank balances or CES records.
const hexPattern=/^[a-f0-9]{64}$/;
const subjectPattern=/^[A-Za-z0-9:._-]{6,160}$/;
const accountPattern=/^[A-Z0-9][A-Z0-9._-]{2,79}$/;

export async function migrateCesOwnershipChallenges(pool){
  if(typeof pool?.query!=='function')throw new Error('postgres_pool_required');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS neo_bank_ces_challenges (
      challenge_hash text PRIMARY KEY CHECK(challenge_hash ~ '^[a-f0-9]{64}$'),
      neo_subject text NOT NULL REFERENCES neo_bank_accounts(subject) ON DELETE RESTRICT,
      exchange_id text NOT NULL,
      external_account text NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS neo_bank_ces_challenges_expiry_idx
      ON neo_bank_ces_challenges(expires_at);
  `);
}

export function createCesOwnershipChallengeStore(pool){
  if(typeof pool?.query!=='function')throw new Error('postgres_pool_required');
  return {
    async put({challengeHash,neoSubject,exchangeId,externalAccount,expiresAt}={}){
      if(!hexPattern.test(challengeHash||'')||
        !subjectPattern.test(neoSubject||'')||
        !/^[A-Z0-9]{3,12}$/.test(exchangeId||'')||
        !accountPattern.test(externalAccount||'')||
        !Number.isFinite(Date.parse(expiresAt||''))){
        throw new Error('invalid_ces_challenge');
      }
      await pool.query(`
        INSERT INTO neo_bank_ces_challenges
        (challenge_hash,neo_subject,exchange_id,external_account,expires_at)
        VALUES ($1,$2,$3,$4,$5)
      `,[challengeHash,neoSubject,exchangeId,externalAccount,expiresAt]);
    },
    async consume({challengeHash,neoSubject,exchangeId,externalAccount,now}={}){
      if(!hexPattern.test(challengeHash||'')||
        !subjectPattern.test(neoSubject||'')||
        !/^[A-Z0-9]{3,12}$/.test(exchangeId||'')||
        !accountPattern.test(externalAccount||'')||
        !Number.isFinite(Date.parse(now||'')))return false;
      const {rows}=await pool.query(`
        DELETE FROM neo_bank_ces_challenges
        WHERE challenge_hash=$1 AND neo_subject=$2 AND exchange_id=$3
          AND external_account=$4 AND expires_at>$5
        RETURNING challenge_hash
      `,[challengeHash,neoSubject,exchangeId,externalAccount,now]);
      return rows?.length===1;
    }
  };
}
