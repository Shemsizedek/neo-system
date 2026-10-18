import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {validateJournal,postJournal,type Journal} from './ledger';
import {authorizePosting,approveDistribution,type Principal,type Distribution} from './controls';
const treasurer:Principal={id:'officer-1',roles:['TREASURER','TRUSTEE'],templeIds:['temple-24']};
const journal:Journal={id:'j1',source:'test',createdAt:'2026-10-18T00:00:00Z',status:'DRAFT',approvedBy:[],lines:[
 {account:'cash',fund:'GENERAL',currency:'USD',debit:100n,credit:0n},
 {account:'income',fund:'GENERAL',currency:'USD',debit:0n,credit:100n}
]};
describe('G004 accounting controls',()=>{
 it('rejects unbalanced entries',()=>assert.ok(validateJournal({...journal,lines:[...journal.lines.slice(0,1),{...journal.lines[1],credit:99n}]}).includes('Unbalanced currency: USD')));
 it('requires two distinct posting approvals',()=>assert.throws(()=>postJournal({...journal,approvedBy:['a']})));
 it('posts balanced approved entries in memory',()=>assert.equal(postJournal({...journal,approvedBy:['a','b']}).status,'POSTED'));
 it('rejects unapproved treasurer',()=>assert.throws(()=>authorizePosting(journal,[{actorId:'a',decision:'APPROVE',recordedAt:'x'},{actorId:'b',decision:'APPROVE',recordedAt:'x'}],treasurer)));
 it('rejects non-trustee distribution approval',()=>{
 const d:Distribution={id:'d1',beneficiaryId:'b',templeId:'temple-24',fundId:'SICK',amountMinor:100n,currency:'USD',state:'PENDING'};
 assert.throws(()=>approveDistribution(d,[],{id:'x',roles:['MEMBER'],templeIds:['temple-24']}));
 });
});
