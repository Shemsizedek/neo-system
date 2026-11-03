import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

export function sha256(value) {
  if(typeof value !== 'string' || !value.length) throw new Error('invalid_hash_input');
  return createHash('sha256').update(value).digest('hex');
}
export function createNeonOauthStore({query, key, keyVersion='staging-v1'}={}) {
  if(typeof query!=='function')throw new Error('database_query_missing');
  if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('vault_key_missing_or_wrong_length');
  const must = (v,name) => {if(typeof v!=='string'||!v.trim())throw new Error('missing_'+name);return v;};
  return {
    async createState({stateHash,tenantId,subjectId,sessionId,expiresAt}) {
      must(stateHash,'state_hash'); must(tenantId,'tenant_id'); must(subjectId,'subject_id');must(sessionId,'session_id');
      if(!/^[0-9a-f]{64}$/.test(stateHash)||!(Number.isFinite(expiresAt)&&expiresAt>Date.now()&&expiresAt-Date.now()<=300000))throw new Error('invalid_state_lifetime');
      await query('INSERT INTO neofx_auth.oauth_state (state_hash,tenant_id,subject_id,session_hash,broker,environment,expires_at) VALUES ($1,$2,$3,$4,\'alpaca\',\'paper\',to_timestamp($5/1000.0))',[stateHash,tenantId,subjectId,sha256(sessionId),expiresAt]);
    },
    async consumeState({stateHash,tenantId,subjectId,sessionId}) {
      const result=await query(`UPDATE neofx_auth.oauth_state SET consumed_at=now() WHERE state_hash=$1 AND tenant_id=$2 AND subject_id=$3 AND session_hash=$4 AND broker='alpaca' AND environment='paper' AND consumed_at IS NULL AND expires_at>now() RETURNING state_hash`,[must(stateHash,'state_hash'),must(tenantId,'tenant_id'),must(subjectId,'subject_id'),sha256(must(sessionId,'session_id'))]);
      return result?.rows?.length===1;
    },
    async storeToken({tenantId,subjectId,token}) {
      must(tenantId,'tenant_id');must(subjectId,'subject_id');
      if(!token||typeof token.access_token!=='string')throw new Error('invalid_access_token');
      const nonce=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,nonce);
      const aad=Buffer.from(JSON.stringify({tenantId,subjectId,broker:'alpaca',environment:'paper',keyVersion}));
      cipher.setAAD(aad);
      const encrypted=Buffer.concat([cipher.update(JSON.stringify(token),'utf8'),cipher.final()]);
      await query(`INSERT INTO neofx_auth.broker_tokens (tenant_id,subject_id,broker,environment,encrypted_payload,encryption_key_version,nonce,auth_tag) VALUES ($1,$2,'alpaca','paper',$3,$4,$5,$6) ON CONFLICT (tenant_id,subject_id,broker,environment) DO UPDATE SET encrypted_payload=EXCLUDED.encrypted_payload,encryption_key_version=EXCLUDED.encryption_key_version,nonce=EXCLUDED.nonce,auth_tag=EXCLUDED.auth_tag,revoked_at=NULL`,[tenantId,subjectId,encrypted,keyVersion,nonce,cipher.getAuthTag()]);
      return {stored:true};
    },
    async getToken({tenantId,subjectId}) {
      must(tenantId,'tenant_id');must(subjectId,'subject_id');
      const result=await query(`SELECT encrypted_payload,encryption_key_version,nonce,auth_tag FROM neofx_auth.broker_tokens WHERE tenant_id=$1 AND subject_id=$2 AND broker='alpaca' AND environment='paper' AND revoked_at IS NULL`,[tenantId,subjectId]);
      const row=result?.rows?.[0];if(!row)return null;
      if(row.encryption_key_version!==keyVersion)throw new Error('unsupported_key_version');
      const decipher=createDecipheriv('aes-256-gcm',key,row.nonce);
      decipher.setAAD(Buffer.from(JSON.stringify({tenantId,subjectId,broker:'alpaca',environment:'paper',keyVersion})));
      decipher.setAuthTag(row.auth_tag);
      return JSON.parse(Buffer.concat([decipher.update(row.encrypted_payload),decipher.final()]).toString('utf8'));
    }
  };
}
