/**
 * NEO-FLIP-011 isolated Neon scratch configuration. No production URI accepted.
 * Constants are nonsecret, verified from the Neon endpoint inventory on 2026-11-21.
 */
export const SCRATCH_DB = Object.freeze({
  projectId:'mute-rice-57396659',
  branchId:'br-holy-lab-ar0at3wz',
  endpointHost:'ep-silent-dream-arc4371g.c-4.us-west-2.aws.neon.tech',
  database:'neo_deal_desk_staging',
  role:'neo_flipper_gate9_app'
});
function reject(code){const e=new Error(code);e.code=code;throw e}
/**
 * Validate privately. NEVER log, serialize, or return the password to diagnostics.
 * Endpoint and restricted role are pinned to prevent accidental parent/prod writes.
 */
export function assertScratchDatabaseUrl(value){
  if(typeof value!=='string'||value.length<60||value.length>4096)reject('scratch_connection_missing');
  let parsed;try{parsed=new URL(value)}catch{reject('invalid_scratch_connection_url')}
  if(!['postgresql:','postgres:'].includes(parsed.protocol)||
      parsed.hostname!==SCRATCH_DB.endpointHost||
      decodeURIComponent(parsed.username)!==SCRATCH_DB.role||
      decodeURIComponent(parsed.pathname.slice(1))!==SCRATCH_DB.database||
      !parsed.password||parsed.hash||parsed.port)reject('scratch_connection_identity_mismatch');
  const mode=parsed.searchParams.get('sslmode');
  if(!['require','verify-full'].includes(mode))reject('scratch_ssl_required');
  if([...parsed.searchParams.keys()].some(key=>!['sslmode','channel_binding','connect_timeout','application_name'].includes(key)))
    reject('scratch_connection_option_forbidden');
  return Object.freeze({projectId:SCRATCH_DB.projectId,branchId:SCRATCH_DB.branchId,
    endpointHost:parsed.hostname,database:SCRATCH_DB.database,role:SCRATCH_DB.role,tlsRequired:true});
}
