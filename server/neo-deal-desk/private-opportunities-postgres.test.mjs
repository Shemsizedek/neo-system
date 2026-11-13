import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostgresOpportunityAdapters} from './private-opportunities-postgres.mjs';
test('adapter always uses parameterized SQL, never interpolates input',async()=>{
 const calls=[];
 const db={async query(sql,values){calls.push({sql,values});return {rows:[{id:'NIBIRU-NC-001'}]}}};
 const {storage,audit}=createPostgresOpportunityAdapters({db});
 await storage.insert({id:'NIBIRU-NC-001',opportunity_name:"O'Brien",asset_category:'infrastructure',source_project:'NEO Estates'});
 assert.match(calls[0].sql,/VALUES \(\$1/);
 assert.deepEqual(calls[0].values,['NIBIRU-NC-001',"O'Brien",'infrastructure','NEO Estates']);
 assert.ok(!calls[0].sql.includes("O'Brien"));
 await storage.get('NIBIRU-NC-001');
 await storage.updateReview('NIBIRU-NC-001',{stage:'due_diligence'});
 assert.deepEqual(calls[2].values,['NIBIRU-NC-001','due_diligence']);
 await assert.rejects(audit.append({}),/durable_audit_store_not_configured/);
});
test('rejects untrusted identifier before SQL',async()=>{
 const {storage}=createPostgresOpportunityAdapters({db:{async query(){throw Error('must_not_query')}}});
 await assert.rejects(storage.get("'; DROP TABLE"),/invalid_opportunity_id/);
});
