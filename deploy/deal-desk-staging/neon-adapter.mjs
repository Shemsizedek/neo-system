import {postgresLeadStore} from '../../server/neo-deal-desk/lead-storage.mjs';
import {qualifyInboundLead,qualifyAgentDiscovery} from '../../server/neo-deal-desk/shared-qualification.mjs';

export function validateStagingConfig(env=process.env){
 const errors=[];
 if(env.CASHFLOW_STAGING_ENABLED!=='true')errors.push('staging_disabled');
 if(env.LIVE_TRANSACTIONS!=='false')errors.push('transactions_must_be_disabled');
 if(env.REAL_CUSTOMER_INTAKE!=='false')errors.push('real_customer_intake_must_be_disabled');
 if(!/^postgres(ql)?:\/\//.test(env.DATABASE_URL||''))errors.push('database_url_missing');
 if(env.PGSSLMODE!=='verify-full')errors.push('tls_hostname_verification_required');
 if(!env.OIDC_ISSUER||!env.OIDC_AUDIENCE||!env.OIDC_JWKS_URI)errors.push('oidc_required');
 return {valid:errors.length===0,errors};
}
export async function createStagingStore({env=process.env,Pool}={}){
 const status=validateStagingConfig(env);
 if(!status.valid)throw new Error('staging_config_blocked:'+status.errors.join(','));
 if(typeof Pool!=='function')throw new Error('postgres_driver_required');
 const pool=new Pool({connectionString:env.DATABASE_URL,max:3,connectionTimeoutMillis:5000,
  ssl:{rejectUnauthorized:true},application_name:'neo-deal-desk-staging'});
 await pool.query('SELECT 1 AS connected');
 return {pool,store:postgresLeadStore(pool)};
}
export function draftOpportunity({type,payload}={}){
 if(type==='inbound')return qualifyInboundLead(payload);
 if(type==='agent')return qualifyAgentDiscovery(payload);
 throw new Error('unrecognized_opportunity_source');
}
export function operatorAuthorized(identity){
 return identity?.verified===true&&Array.isArray(identity.roles)&&identity.roles.includes('neo_sales_operator');
}
