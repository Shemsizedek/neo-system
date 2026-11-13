import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateOpportunityService,OpportunityAccessError} from './private-opportunities.mjs';
const rows=new Map(),events=[];
const storage={
 async insert(r){rows.set(r.id,r);return r},
 async get(id){return rows.get(id)||null},
 async list(){return [...rows.values()]},
 async updateReview(id,patch){const row={...rows.get(id),...patch};rows.set(id,row);return row}
};
const svc=createPrivateOpportunityService({storage,audit:{async append(event){events.push(event)}}});
const analyst={authenticated:true,subject:'review-user-1',neopassStatus:'active',role:'deal-desk-analyst'};
const reviewer={authenticated:true,subject:'review-user-2',neopassStatus:'active',role:'deal-desk-reviewer'};
test('rejects unauthenticated access',async()=>{
 await assert.rejects(svc.list({}),e=>e instanceof OpportunityAccessError&&e.status===401);
});
test('rejects unapproved role and inactive NEOpass',async()=>{
 await assert.rejects(svc.list({session:{...analyst,role:'member'}}),/permission_denied/);
 await assert.rejects(svc.list({session:{...analyst,neopassStatus:'pending'}}),/active_neopass_required/);
});
test('creates restricted research opportunity and ignores injected approval',async()=>{
 const r=await svc.create({session:analyst,input:{
 id:'NIBIRU-NC-001',opportunity_name:'Bitcoin Oasis Farm',asset_category:'infrastructure',
 source_project:'NEO Estates',offering_status:'approved',verification_status:'verified'
 }});
 assert.equal(r.offering_status,'not_authorized');
 assert.equal(r.verification_status,'unverified');
 assert.equal(r.confidentiality,'restricted');
 assert.equal((await svc.list({session:reviewer})).length,1);
});
test('reviewer can change research stage but cannot authorize offering',async()=>{
 await assert.rejects(svc.create({session:reviewer,input:{}}),/permission_denied/);
 const r=await svc.review({session:reviewer,id:'NIBIRU-NC-001',stage:'due_diligence'});
 assert.equal(r.offering_status,'not_authorized');
 assert.equal(r.stage,'due_diligence');
 await assert.rejects(svc.review({session:analyst,id:r.id,stage:'approval_required'}),/permission_denied/);
 assert.ok(events.length>=2);
});
