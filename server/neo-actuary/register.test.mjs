import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileRegister,reconcileJournal} from './register.mjs';
const record=(id,type,amountMinor,extra={})=>({id,type,amountMinor,unit:'NEO',sourceId:'e-'+id,...extra});
test('separates verified assets, obligations and documentary observations',()=>{
 const x=reconcileRegister({asOf:'2026-10-28',records:[
 record('a','ASSET','100',{ownershipVerified:true,custodyVerified:true,valuationVerified:true}),
 record('b','LIABILITY','50',{enforceabilityReviewed:true}),
 record('c','COMMUNITY_CREDIT','900'),
 record('d','CUSTODY_OBSERVATION','10'),
 record('e','ASSET','999')]});
 assert.equal(x.classified.length,2);assert.equal(x.pending.length,3);
 assert.equal(x.classified.find(v=>v.type==='ASSET').amountMinor,'100');
});
test('requires balanced ledger journal for each transaction and unit',()=>{
 const j=reconcileJournal({entries:[{id:'1',transactionId:'T',side:'DEBIT',unit:'NEO',amountMinor:'100'},{id:'2',transactionId:'T',side:'CREDIT',unit:'NEO',amountMinor:'90'}]});
 assert.equal(j[0].balanced,false);
});
test('rejects duplicate evidence identifiers',()=>assert.throws(()=>reconcileRegister({asOf:'2026-10-28',records:[record('x','COMMUNITY_CREDIT','1'),record('x','COMMUNITY_CREDIT','2')]}),/Unique/));
