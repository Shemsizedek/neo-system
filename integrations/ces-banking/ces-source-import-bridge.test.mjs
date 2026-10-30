import test from 'node:test';
import assert from 'node:assert/strict';
import {createCesSourceStore} from '../../server/neo-bots/ces-source-store.mjs';
import {NMNI_TRADING_COLUMNS} from '../../server/neo-bots/nmni-admin-reader.mjs';
import {reconcileCesSourceImportIndex} from './ces-source-import-evidence.mjs';

test('dedicated CES source store metadata can be consumed without posting NEO Bank entries',async()=>{
 const captured=[];
 const pool={async query(sql,values){
  if(sql.startsWith('INSERT INTO neo_ces_source_imports')){
    captured.push({id:values[0],exchange_id:values[1],observed_at:new Date(values[2]),
      imported_at:new Date('2026-10-29T22:01:00.000Z'),row_count:values[3]});
    return {rows:[{id:values[0]}]};
  }
  if(sql.startsWith('SELECT id,exchange_id,observed_at,imported_at,row_count FROM neo_ces_source_imports')){
    return {rows:captured};
  }
  throw new Error('Unexpected query: source-only store required');
 }};
 const store=createCesSourceStore(pool);
 const result=await store.importSnapshot({
   schemaVersion:'neo.ces.browser-evidence.v1',exchangeId:'NMNI',
   observedAt:'2026-10-29T22:00:00.000Z',
   source:{origin:'https://www.community-exchange.org',path:'/_admin/statstrading.asp',method:'authenticated-server-read'},
   scrapedReport:{columns:[...NMNI_TRADING_COLUMNS],monthlyRows:[[
    '1','July 2016','1','100000000.00','100000000.00','7999999.82','92000000.18','100000000.00',
   ]]},
 });
 assert.equal(result.imported,true);
 assert.equal(result.recordType,'historical-trading-summary');
 const bridge=reconcileCesSourceImportIndex({imports:await store.list()});
 assert.equal(bridge.indexedCount,1);
 assert.equal(bridge.importSummaries[0].sourceImportSha256,result.id);
 assert.equal(bridge.importSummaries[0].rowCount,1);
 assert.equal(bridge.importSummaries[0].sourceUnit,'NEO');
 assert.equal(bridge.importSummaries[0].financialLedgerPostingAuthorized,false);
 assert.equal(bridge.neoBankEntriesCreated,0);
 assert.equal(bridge.paymentInstructionsCreated,0);
 assert.equal(bridge.historyComplete,false);
});
