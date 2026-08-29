import test from 'node:test';
import assert from 'node:assert/strict';
import { createTokenworks } from './tokenworks.mjs';

const clock = { value: Date.parse('2026-08-29T00:00:00Z') };
const service = () => createTokenworks({ now: () => clock.value });

test('Neopass grants expiring access without transferring ownership', () => {
  const neo=service();
  const lease=neo.grantSharedAccess({ownerAccountId:'owner',borrowerAccountId:'borrower',ownerAddress:'1Owner',asset:'nomni',entitlement:'private-forum',expiresAt:'2026-08-30T00:00:00Z'});
  assert.equal(lease.mode,'SHARED_ACCESS'); assert.equal(lease.asset,'NOMNI');
  assert.equal(lease.onChainOwnershipTransferred,false); assert.equal(lease.ownerAccessDuringLease,'SUSPENDED');
  assert.equal(neo.revokeSharedAccess(lease.id).status,'REVOKED');
});

test('address proof challenge is nonce-based and short lived', () => {
  const challenge=service().issueAddressChallenge({address:'1Owner',accountId:'owner'});
  assert.equal(challenge.domain,'neo.services'); assert.equal(challenge.nonce.length,64); assert.equal(challenge.usedAt,null);
});

test('escrow endpoint creates disabled, explicit enforcement plan', () => {
  const plan=service().composeEscrowPlan({ownerAddress:'1Owner',borrowerAddress:'1Borrower',returnAddress:'1Owner',asset:'NOMNI',quantity:'1',currentBlock:910000,expiryBlock:910144,enforcement:'BITCOIN_SCRIPT'});
  assert.equal(plan.status,'PLAN_ONLY'); assert.equal(plan.composeEnabled,false); assert.equal(plan.enforcement,'BITCOIN_SCRIPT');
});

test('rejects expired access and past block locks', () => {
  const neo=service();
  assert.throws(()=>neo.grantSharedAccess({ownerAccountId:'a',borrowerAccountId:'b',ownerAddress:'1',asset:'X',entitlement:'x',expiresAt:'2020-01-01T00:00:00Z'}));
  assert.throws(()=>neo.composeEscrowPlan({ownerAddress:'1',borrowerAddress:'2',returnAddress:'1',asset:'X',quantity:'1',currentBlock:10,expiryBlock:9}));
});
