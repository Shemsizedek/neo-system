import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransactionalOpportunityWriter} from './private-opportunities-transactional.mjs';
function mock({auditFails=false}={}) {
 const queries=[];const pool={async connect(){return {async query(sql,values=[]){
 queries.push({sql,values});
 if(auditFails&&sql.includes('INSERT INTO private_deal_opportunity_audit'))throw Error('audit_failed');
 return {rows:[{id:'NIBIRU-NC-001',stage:'research',offering_status:'not_authorized'}]};
 },release(){queries.push({sql:'RELEASE'})}}}};
 return {queries,writer:createTransactionalOpportunityWriter({pool})};
}
const analyst={authenticated:true,subject:'test-analyst',neopassStatus:'active',role:'deal-desk-analyst'};
test('write and audit committed together',async()=>{
 const {queries,writer}=mock();
 await writer.create({session:analyst,input:{id:'NIBIRU-NC-001',opportunity_name:'Test',asset_category:'infrastructure',source_project:'NEO Estates'}});
 assert.equal(queries[0].sql,'BEGIN');
 assert.equal(queries.at(-2).sql,'COMMIT');
 assert.equal(queries.filter(q=>q.sql.includes('INSERT INTO private_deal_opportunity_audit')).length,1);
});
test('failed audit rolls back opportunity write',async()=>{
 const {queries,writer}=mock({auditFails:true});
 await assert.rejects(writer.create({session:analyst,input:{id:'NIBIRU-NC-001',opportunity_name:'Test',asset_category:'infrastructure',source_project:'NEO Estates'}}),/audit_failed/);
 assert.ok(queries.some(q=>q.sql==='ROLLBACK'));
 assert.ok(!queries.some(q=>q.sql==='COMMIT'));
});
test('client cannot authorize an offering',async()=>{
 const {queries,writer}=mock();
 await writer.create({session:analyst,input:{id:'NIBIRU-NC-001',opportunity_name:'Test',asset_category:'infrastructure',source_project:'NEO Estates',offering_status:'approved'}});
 assert.ok(!queries[1].sql.includes('offering_status'));
});
test('rejects unauthorized reviewer',async()=>{
 const {writer}=mock();
 await assert.rejects(writer.changeStage({session:analyst,id:'NIBIRU-NC-001',stage:'due_diligence'}),/permission_denied/);
});
