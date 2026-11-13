import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCesSourceImportMetadata,reconcileCesSourceImportIndex} from './ces-source-import-evidence.mjs';
const valid={
 id:'a'.repeat(64),exchange_id:'NMNI',
 observed_at:'2026-10-29T18:00:00.000Z',
 imported_at:'2026-10-29T18:02:00.000Z',row_count:33,
};
test('dedicated CES source imports remain historical non-spendable evidence',()=>{
 const r=reconcileCesSourceImportIndex({imports:[valid]});
 assert.equal(r.indexedCount,1);
 assert.equal(r.importSummaries[0].sourceUnit,'NEO');
 assert.equal(r.importSummaries[0].sourceRecordType,'historical-trading-summary');
 assert.equal(r.importSummaries[0].accountBalanceVerified,false);
 assert.equal(r.importSummaries[0].financialLedgerPostingAuthorized,false);
 assert.equal(r.neoBankEntriesCreated,0);
 assert.equal(r.historyComplete,false);
});
test('no raw account, credential, transfer or false source classification accepted',()=>{
 for(const extra of [
  {balance:'500000'},{memberEmail:'person@example.org'},
  {memberAccount:'PRIVATE0001'},{secret:'private'},
  {sourceUnit:'USD'},{asset:'NOMNI'}, {wireInstructions:{}},
  {exchange_id:'XCPC'}, {row_count:0},{row_count:251},
  {observed_at:'2026-10-30T00:00:00Z'}
 ])assert.throws(()=>validateCesSourceImportMetadata({...valid,...extra}));
 assert.throws(()=>reconcileCesSourceImportIndex({imports:[valid,valid]}),/Duplicate/);
 assert.deepEqual(reconcileCesSourceImportIndex({imports:[]}).importSummaries,[]);
});
test('import evidence library contains no external transports or secret access',async()=>{
 const source=await readFile(new URL('./ces-source-import-evidence.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:fetch|require|WebSocket|eval)\s*\(|\bimport\s*\(|\bprocess\.env\b|node:(?:http|https|tls|net|child_process)/);
});
