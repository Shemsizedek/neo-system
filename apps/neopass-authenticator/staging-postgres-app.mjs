import {createIsolatedStagingHttpAdapter} from './staging-http-adapter.mjs';
import {createPostgresCeremonyStore} from './postgres-ceremony-store.mjs';

// Opt-in composition only: cannot open a port, issue a session, or grant privilege.
// 'staging' must come from the reviewed NEO Key authority; never from HTTP JSON.
// The NEO Key PR #1435 and this PR remain unmerged and unmounted.
export function createIsolatedPostgresAuthenticator({
  enabled=false, pool, hmacKey, rpId, origin, now,
  staging, authenticateRequest, verifyCsrf, takeRateLimit,
  lookupCredentialId, authorizeEnrollment
}={}) {
  if (enabled!==true) return createIsolatedStagingHttpAdapter();
  const ceremonies=createPostgresCeremonyStore({pool,hmacKey,rpId,origin,now});
  return createIsolatedStagingHttpAdapter({
    enabled:true, rpId, origin, now, ceremonies, staging,
    authenticateRequest, verifyCsrf, takeRateLimit,
    lookupCredentialId, authorizeEnrollment
  });
}
