import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { screenKnowindexStorageInventory } from './storage-selection.mjs';

const inventory = JSON.parse(await fs.readFile('data/knowindex/ki020-storage-candidates.json','utf8'));
const candidate = () => ({
  provider: 'neon', name: 'knowindex-isolated-production', workstream: 'knowindex',
  environment: 'production', productionEligible: true,
  operatorApprovalVerified: true, securityApprovalVerified: true,
  isolatedDatabaseVerified: true, leastPrivilegeVerified: true,
  offHostBackupVerified: true, independentRestoreVerified: true,
  backupEvidenceSha256: 'b'.repeat(64)
});
const derive = overrides => ({
  ...inventory, candidates: [candidate()], ...overrides
});

test('all 8 connected Render/Neon candidates remain unapproved', () => {
  assert.equal(inventory.candidates.length, 8);
  const result = screenKnowindexStorageInventory(inventory);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.productionWritesApproved, false);
  assert.equal(result.eligibleCandidateCount, 0);
});
test('rejects any cross-product production database even with fabricated approval flags', () => {
  for (const workstream of ['neo-pads','noogle-connect','neo-bank','neo-oracle']) {
    const result = screenKnowindexStorageInventory(derive({
      candidates: [{...candidate(),workstream}]
    }));
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.eligibleCandidateCount,0);
  }
});
test('storage isolation alone cannot approve live writes', () => {
  const result=screenKnowindexStorageInventory(derive());
  assert.equal(result.status,'CANDIDATE_REVIEW_COMPLETE');
  assert.equal(result.productionWritesApproved,false);
  assert.match(result.nextAction,/KI-018/);
});
test('operator, security, backups, restoration and privileges are individually mandatory', () => {
  for (const field of ['operatorApprovalVerified','securityApprovalVerified','isolatedDatabaseVerified',
    'leastPrivilegeVerified','offHostBackupVerified','independentRestoreVerified']) {
    const result=screenKnowindexStorageInventory(derive({candidates:[{...candidate(),[field]:false}]}));
    assert.equal(result.status,'BLOCKED',field);
  }
  assert.equal(screenKnowindexStorageInventory(derive({candidates:[{...candidate(),backupEvidenceSha256:'0'.repeat(64)}]})).status,'BLOCKED');
});
test('rejects duplicate candidates and ambiguous production DB selection', () => {
  assert.equal(screenKnowindexStorageInventory(derive({candidates:[candidate(),candidate()]})).status,'BLOCKED');
  assert.equal(screenKnowindexStorageInventory(derive({candidates:[candidate(),{...candidate(),name:'knowindex-second-production'}]})).status,'BLOCKED');
});
test('direct authorization of inventory never passes screening', () => {
  assert.equal(screenKnowindexStorageInventory(derive({productionWritesApproved:true})).status,'BLOCKED');
  assert.equal(screenKnowindexStorageInventory(derive({selectedProductionDatabase:'knowindex-isolated-production'})).status,'BLOCKED');
});
test('invalid or missing evidence fails closed', () => {
  for(const x of [null,{},[],{...inventory,candidates:null},{...inventory,candidates:[]}]){
    assert.equal(screenKnowindexStorageInventory(x).status,'BLOCKED');
  }
});
