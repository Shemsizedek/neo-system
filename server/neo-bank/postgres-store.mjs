import {createHash,randomUUID} from 'node:crypto';

const clean=value=>String(value??'').trim();
const subjectKey=subject=>createHash('sha256').update(clean(subject)).digest('hex');
const publicAccount=value=>({accountNumber:value.account_number,displayName:value.display_name,role:value.role||'member',balance:Number(value.balance||0),creditLimit:Number(value.credit_limit||0),status:value.status||'active',createdAt:value.created_at});
const apiAccount=value=>value?{...value,accountNumber:value.account_number,displayName:value.display_name,creditLimit:Number(value.credit_limit||0),balance:Number(value.balance||0),createdAt:value.created_at}:null;

export async function migrateNeoBankPostgres(pool){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS neo_bank_accounts (
      id text PRIMARY KEY,
      subject text NOT NULL UNIQUE,
      account_number text NOT NULL UNIQUE,
      display_name text NOT NULL,
      email text NOT NULL DEFAULT '',
      role text NOT NULL DEFAULT 'member',
      balance numeric(20,8) NOT NULL DEFAULT 0,
      credit_limit numeric(20,8) NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS neo_bank_offers (
      id uuid PRIMARY KEY,
      member_id text NOT NULL REFERENCES neo_bank_accounts(id),
      account_number text NOT NULL,
      display_name text NOT NULL,
      kind text NOT NULL,
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      amount numeric(20,8) NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'NOMNI',
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS neo_bank_entries (
      id uuid PRIMARY KEY,
      from_account text NOT NULL,
      to_account text NOT NULL,
      amount numeric(20,8) NOT NULL,
      currency text NOT NULL DEFAULT 'NOMNI',
      memo text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'posted',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS neo_bank_idempotency (
      account_id text NOT NULL,
      idempotency_key text NOT NULL,
      result jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(account_id,idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS neo_bank_offers_status_kind_created_idx ON neo_bank_offers(status,kind,created_at DESC);
    CREATE INDEX IF NOT EXISTS neo_bank_entries_from_created_idx ON neo_bank_entries(from_account,created_at DESC);
    CREATE INDEX IF NOT EXISTS neo_bank_entries_to_created_idx ON neo_bank_entries(to_account,created_at DESC);
  `);
}

export function createNeoBankPostgresStore({pool,now=()=>new Date().toISOString()}={}){
  if(!pool?.query)throw new Error('postgres_pool_required');
  return {
    async ping(){await pool.query('SELECT 1');return true},
    async ensureMember(identity){
      const id=subjectKey(identity.subject),createdAt=now(),role=identity.role||'member';
      const {rows}=await pool.query(`INSERT INTO neo_bank_accounts(id,subject,account_number,display_name,email,role,created_at,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$7)
        ON CONFLICT(subject) DO UPDATE SET role=CASE WHEN EXCLUDED.role='executive-admin' THEN 'executive-admin' ELSE neo_bank_accounts.role END,updated_at=$7
        RETURNING *`,[id,identity.subject,`CES-${id.slice(0,10).toUpperCase()}`,clean(identity.name)||'CES Member',clean(identity.email).toLowerCase(),role,createdAt]);
      return apiAccount(rows[0]);
    },
    async accountBySubject(subject){const {rows}=await pool.query('SELECT * FROM neo_bank_accounts WHERE subject=$1',[subject]);return apiAccount(rows[0]||null)},
    async account(accountNumber){const key=clean(accountNumber);if(!/^[A-Za-z0-9._-]{2,80}$/.test(key))return null;const {rows}=await pool.query('SELECT * FROM neo_bank_accounts WHERE account_number=$1',[key]);return apiAccount(rows[0]||null)},
    async directory(limit=100){const {rows}=await pool.query('SELECT * FROM neo_bank_accounts WHERE status=\'active\' ORDER BY created_at DESC LIMIT $1',[Math.min(Number(limit)||100,100)]);return rows.map(publicAccount)},
    async updateAccount(accountNumber,input){const creditLimit=Number(input.creditLimit),status=input.status==='suspended'?'suspended':'active';if(!Number.isFinite(creditLimit)||creditLimit<0||creditLimit>100000000)throw new Error('invalid_account_update');const {rows}=await pool.query('UPDATE neo_bank_accounts SET credit_limit=$2,status=$3,updated_at=$4 WHERE account_number=$1 RETURNING *',[clean(accountNumber),creditLimit,status,now()]);if(!rows[0])throw new Error('account_not_found');return publicAccount(rows[0])},
    async listOffers({kind,status='open',limit=100}={}){const values=[status,Math.min(Number(limit)||100,100)],filter=kind?' AND kind=$3':'';if(kind)values.push(kind);const {rows}=await pool.query(`SELECT * FROM neo_bank_offers WHERE status=$1${filter} ORDER BY created_at DESC LIMIT $2`,values);return rows.map(row=>({id:row.id,memberId:row.member_id,accountNumber:row.account_number,displayName:row.display_name,kind:row.kind,title:row.title,description:row.description,amount:Number(row.amount),currency:row.currency,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at}))},
    async createOffer(subject,input){const account=await this.accountBySubject(subject);if(!account)throw new Error('account_not_found');const kind=input.kind==='need'?'need':'offer',title=clean(input.title),description=clean(input.description),amount=Number(input.amount||0);if(title.length<3||title.length>120||description.length>1000||!Number.isFinite(amount)||amount<0)throw new Error('invalid_offer');const id=randomUUID(),timestamp=now();await pool.query('INSERT INTO neo_bank_offers(id,member_id,account_number,display_name,kind,title,description,amount,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',[id,account.id,account.account_number,account.display_name,kind,title,description,amount,timestamp]);return{id,memberId:account.id,accountNumber:account.account_number,displayName:account.display_name,kind,title,description,amount,currency:'NOMNI',status:'open',createdAt:timestamp,updatedAt:timestamp}},
    async statements(subject,limit=100){const account=await this.accountBySubject(subject);if(!account)return null;const {rows}=await pool.query('SELECT * FROM neo_bank_entries WHERE from_account=$1 OR to_account=$1 ORDER BY created_at DESC LIMIT $2',[account.account_number,Math.min(Number(limit)||100,100)]);return{account:publicAccount(account),entries:rows.map(row=>({id:row.id,fromAccount:row.from_account,toAccount:row.to_account,amount:Number(row.amount),currency:row.currency,memo:row.memo,status:row.status,createdAt:row.created_at}))}},
    async transfer(subject,input){
      const toAccount=clean(input.toAccount),amount=Number(input.amount),memo=clean(input.memo),key=clean(input.idempotencyKey);if(!/^CES-[A-Z0-9]{10}$/.test(toAccount)||!Number.isFinite(amount)||amount<=0||amount>100000000||memo.length>240||key.length<8||key.length>100)throw new Error('invalid_transfer');
      const client=await pool.connect();try{await client.query('BEGIN');const fromResult=await client.query('SELECT * FROM neo_bank_accounts WHERE subject=$1 FOR UPDATE',[subject]);const toResult=await client.query('SELECT * FROM neo_bank_accounts WHERE account_number=$1 FOR UPDATE',[toAccount]);const from=fromResult.rows[0],to=toResult.rows[0];if(!from)throw new Error('account_not_found');if(!to)throw new Error('recipient_not_found');if(from.id===to.id)throw new Error('self_transfer');const idemKey=createHash('sha256').update(key).digest('hex'),existing=await client.query('SELECT result FROM neo_bank_idempotency WHERE account_id=$1 AND idempotency_key=$2',[from.id,idemKey]);if(existing.rows[0]){await client.query('COMMIT');return existing.rows[0].result}const next=Number(from.balance)-amount;if(next < -Number(from.credit_limit))throw new Error('insufficient_credit');const createdAt=now(),id=randomUUID(),result={id,fromAccount:from.account_number,toAccount:to.account_number,amount,currency:'NOMNI',memo,status:'posted',createdAt};await client.query('UPDATE neo_bank_accounts SET balance=$2,updated_at=$3 WHERE id=$1',[from.id,next,createdAt]);await client.query('UPDATE neo_bank_accounts SET balance=balance+$2,updated_at=$3 WHERE id=$1',[to.id,amount,createdAt]);await client.query('INSERT INTO neo_bank_entries(id,from_account,to_account,amount,memo,created_at) VALUES($1,$2,$3,$4,$5,$6)',[id,from.account_number,to.account_number,amount,memo,createdAt]);await client.query('INSERT INTO neo_bank_idempotency(account_id,idempotency_key,result,created_at) VALUES($1,$2,$3,$4)',[from.id,idemKey,result,createdAt]);await client.query('COMMIT');return result}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
    }
  };
}
