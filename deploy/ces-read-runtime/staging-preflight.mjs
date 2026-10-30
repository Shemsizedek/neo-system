// Project 144: credential-safe, GET-only health and authorization preflight.
// It never authenticates to CES, imports data, creates bank entries or triggers deployments.
import { pathToFileURL } from 'node:url';

export const CES_STAGING_ORIGIN = 'https://neo-ces-read-staging.onrender.com';
export async function inspectCesReadStaging({request = fetch, token = null} = {}) {
  if (typeof request !== 'function') throw new TypeError('request must be a function');
  if (token !== null && (typeof token !== 'string' || token.length < 32)) {
    throw new Error('Invalid dedicated runtime control token');
  }
  const doGet = async (path, bearer = false) => {
    const headers = bearer ? {authorization:'Bearer '+token} : {};
    return request(CES_STAGING_ORIGIN + path, {
      method:'GET',redirect:'manual',headers,
      signal:AbortSignal.timeout(15_000),
    });
  };
  const healthResponse = await doGet('/health');
  if (healthResponse.status !== 200) return Object.freeze({
    target:'neo-ces-read-staging',healthHttpStatus:healthResponse.status,
    state:'HEALTH_NOT_VERIFIED',readyForImports:false,
  });
  let health;
  try {health=await healthResponse.json()} catch {throw new Error('CES health did not return JSON')}
  if (health?.service!=='neo-ces-read-runtime' || health?.ok!==true ||
      typeof health.database!=='boolean') throw new Error('Unexpected CES health contract');
  const denied = await doGet('/v1/imports');
  if (denied.status !== 401) throw new Error('CRITICAL: unauthenticated CES import listing is not blocked');

  let ready=false;
  let credentialsConfigured=false;
  let databaseConfigured=false;
  let liveWritesEnabled=null;
  if(token) {
    const authorized = await doGet('/v1/status',true);
    if (authorized.status!==200) throw new Error('Runtime control authentication failed');
    let status;
    try {status=await authorized.json()}catch{throw new Error('Invalid CES protected status JSON')}
    if(status?.exchangeId!=='NMNI'||status.financialWritesEnabled!==false||
       typeof status.databaseConfigured!=='boolean'||typeof status.credentialsConfigured!=='boolean') {
      throw new Error('Unexpected or unsafe protected CES status');
    }
    databaseConfigured=status.databaseConfigured;
    credentialsConfigured=status.credentialsConfigured;
    liveWritesEnabled=status.financialWritesEnabled;
    ready=health.database && databaseConfigured && credentialsConfigured;
  }
  // No authentication tokens, URLs containing credentials, account data,
  // source reports or response bodies are returned.
  return Object.freeze({
    target:'neo-ces-read-staging',
    healthHttpStatus:200,
    publicImportsBlocked:true,
    databaseHealthReported:health.database,
    ...(token ? {
      databaseConfigured,
      nmniCredentialPresenceConfirmed:credentialsConfigured,
      financialWritesEnabled:liveWritesEnabled,
    } : {}),
    state:ready?'READY_FOR_SEPARATE_AUTH_PROOF':'SECURE_PROVISIONING_OR_AUTH_PROOF_PENDING',
    readyForImports:false,
    cesAdminAuthenticated:false,
    sourceImportPerformed:false,
  });
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  inspectCesReadStaging({token:process.env.NEO_CES_RUNTIME_TOKEN||null})
    .then(report=>{process.stdout.write(JSON.stringify(report,null,2)+'\n');
      if(report.healthHttpStatus!==200||!report.publicImportsBlocked)process.exitCode=1;})
    .catch(()=>{process.stderr.write('CES preflight failed; check runtime health, authorization or configuration privately.\n');process.exitCode=1;});
}
