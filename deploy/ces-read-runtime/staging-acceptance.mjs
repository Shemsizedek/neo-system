/**
 * Project 144: NMNI authentication and one-time bounded source-import acceptance.
 * Default is auth verification only; import requires two explicit independent
 * opt-in flags and a successful fresh server-side administrator proof.
 *
 * Never pass credentials in URLs, logs, GitHub, CLI args or returned reports.
 * Executes against a fixed NEO-owned staging origin; it cannot transfer money.
 */
import { pathToFileURL } from 'node:url';
import { inspectCesReadStaging, CES_STAGING_ORIGIN } from './staging-preflight.mjs';
import { reconcileCesSourceImportIndex } from '../../integrations/ces-banking/ces-source-import-evidence.mjs';

function assertProof(proof) {
  if (proof?.exchangeId !== 'NMNI' || proof.memberAuthenticated !== true ||
      proof.adminAuthenticated !== true || !Number.isFinite(Date.parse(proof.verifiedAt))) {
    throw new Error('Independent NMNI member and administrator proof required');
  }
  return true;
}
function noDataResponse(payload) {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Malformed CES staging response');
  }
  return payload;
}
export async function runCesStagingAcceptance({
  request = fetch,
  token = null,
  mode = 'verify',
  explicitImportAuthorization = false,
  serverImportEnabled = false,
} = {}) {
  if (!['verify','collect-once'].includes(mode)) throw new Error('Unsupported CES acceptance mode');
  if (mode === 'collect-once' && !(explicitImportAuthorization === true && serverImportEnabled === true)) {
    throw new Error('Source import requires explicit authorization and confirmed server import switch');
  }
  // The existing public guard checks GET health and unauthorized imports and,
  // when supplied, the protected configuration-presence endpoint.
  const preflight = await inspectCesReadStaging({request,token});
  if (preflight.state !== 'READY_FOR_SEPARATE_AUTH_PROOF' || !preflight.databaseHealthReported ||
      !preflight.publicImportsBlocked || preflight.financialWritesEnabled !== false) {
    return Object.freeze({
      phase:'BLOCKED_BY_STAGING_PREFLIGHT',verifiedNMNIAdmin:false,
      sourceImportAttempted:false,sourceImportVerified:false,
      bankLedgerEntriesCreated:0,financialTransfersAuthorized:false,
    });
  }
  const post = async path => {
    const response=await request(CES_STAGING_ORIGIN+path,{
      method:'POST',redirect:'manual',headers:{authorization:'Bearer '+token},
      signal:AbortSignal.timeout(30_000),
    });
    if (response.status !== 200) throw new Error('CES staging protected action was rejected');
    return noDataResponse(await response.json());
  };
  const auth = await post('/v1/auth/check');
  assertProof(auth.proof);
  if (mode === 'verify') {
    return Object.freeze({
      phase:'STAGING_NMNI_ADMIN_PROOF_ACCEPTED',
      verifiedNMNIAdmin:true,sourceImportAttempted:false,
      sourceImportVerified:false,bankLedgerEntriesCreated:0,
      financialTransfersAuthorized:false,
    });
  }
  // The runtime requires its own server-side import enablement independently.
  // Import inserts ONLY a bounded historical source report, never any ledger.
  const result=await post('/v1/collect-import');
  assertProof(result.proof);
  const data=result.import;
  if (typeof data?.id !== 'string' || !/^[a-f0-9]{64}$/.test(data.id) ||
      data.recordType !== 'historical-trading-summary' || data.unit !== 'NEO' ||
      !Number.isInteger(data.rowCount) || data.rowCount < 1 || data.rowCount > 250 ||
      typeof data.imported !== 'boolean') {
    throw new Error('Unexpected CES source import proof');
  }
  const indexResponse=await request(CES_STAGING_ORIGIN+'/v1/imports',{
    method:'GET',redirect:'manual',headers:{authorization:'Bearer '+token},
    signal:AbortSignal.timeout(15_000),
  });
  if (indexResponse.status!==200) throw new Error('CES imported metadata listing unavailable');
  const index = reconcileCesSourceImportIndex(noDataResponse(await indexResponse.json()));
  if (!index.importSummaries.some(v=>v.sourceImportSha256===data.id &&
      v.rowCount===data.rowCount && v.exchangeId==='NMNI')) {
    throw new Error('CES source import not reconciled to protected import index');
  }
  return Object.freeze({
    phase:'SOURCE_IMPORT_REFERENCE_RECONCILED',
    verifiedNMNIAdmin:true,sourceImportAttempted:true,
    sourceImportVerified:true,sourceImportId:data.id,
    importedNewBatch:data.imported,
    rowCount:data.rowCount,unit:'NEO',
    bankLedgerEntriesCreated:0,financialTransfersAuthorized:false,
    holderBalanceImported:false,usdReserveVerified:false,
  });
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  // Operator must explicitly choose the import gate; default verifies only.
  const mode = process.argv.includes('--collect-once') ? 'collect-once' : 'verify';
  runCesStagingAcceptance({
    token:process.env.NEO_CES_RUNTIME_TOKEN||null,
    mode,
    explicitImportAuthorization:process.env.NEO_CES_SOURCE_IMPORT_APPROVED==='true',
    serverImportEnabled:process.env.NEO_CES_IMPORT_ENABLED==='true',
  }).then(result=>{
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if (result.phase==='BLOCKED_BY_STAGING_PREFLIGHT') process.exitCode=1;
  }).catch(()=>{
    process.stderr.write('CES acceptance failed. Validate private staging configuration and NMNI source evidence.\n');
    process.exitCode=1;
  });
}
