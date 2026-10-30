/**
 * Project 144: safe consumer contract for the dedicated NEO CES source importer
 * (PR #1273, table neo_ces_source_imports).
 *
 * This is source metadata, not balances, reserves, bank account entries, or a
 * payment instruction.  No HTTP, database access, CES login, or transaction I/O.
 */
const KEYS=new Set(['id','exchange_id','observed_at','imported_at','row_count']);
const SHA=/^[a-f0-9]{64}$/;
function date(value) {
  const s=value instanceof Date?value.toISOString():value;
  if(typeof s!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(s)) throw new Error('Timestamp must be a UTC ISO 8601 string');
  const n=Date.parse(s);
  if(!Number.isFinite(n))throw new Error('Invalid UTC timestamp');
  return n;
}
export function validateCesSourceImportMetadata(value) {
  if(value===null||typeof value!=='object'||Array.isArray(value) ||
    Object.keys(value).some(k=>!KEYS.has(k))) throw new Error('Unapproved import fields: reject PII, raw reports, bank records');
  if(!SHA.test(value.id) || value.exchange_id!=='NMNI')throw new Error('Unexpected import identity or exchange');
  if(!Number.isInteger(value.row_count)||value.row_count<1||value.row_count>250)throw new Error('Unverified source row count');
  const observed=date(value.observed_at),imported=date(value.imported_at);
  if(observed>imported+300000)throw new Error('Source observation newer than import timestamp');
  return Object.freeze({
    sourceImportSha256:value.id,exchangeId:'NMNI',rowCount:value.row_count,
    reportedObservedAt:new Date(observed).toISOString(),
    reportedImportedAt:new Date(imported).toISOString(),
    sourceRecordType:'historical-trading-summary',
    sourceUnit:'NEO',
    status:'source-import-observed-unverified',
    accountBalanceVerified:false,
    bankBalanceVerified:false,
    cesParityConversionVerified:false,
    usdReservesVerified:false,
    financialLedgerPostingAuthorized:false,
  });
}
export function reconcileCesSourceImportIndex(response) {
  if(!response||typeof response!=='object'||Array.isArray(response) ||
    Object.keys(response).length!==1||!Array.isArray(response.imports)||
    response.imports.length>20)throw new Error('Expected restricted CES import metadata response');
  const items=response.imports.map(validateCesSourceImportMetadata);
  if(new Set(items.map(x=>x.sourceImportSha256)).size!==items.length)throw new Error('Duplicate source import SHA');
  return Object.freeze({
    importSummaries:Object.freeze(items),
    indexedCount:items.length,
    historyComplete:false, // Runtime exposes at most 20 recent rows.
    sourceAccountBalancesImported:false,
    neoBankEntriesCreated:0,
    paymentInstructionsCreated:0,
    sourceIsExternallyVerified:false,
    readiness:'METADATA_ONLY',
  });
}
