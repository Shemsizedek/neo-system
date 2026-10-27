import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEcosSnapshot,parseEcosSnapshotJson,ecosDevelopmentStatus} from './ecosReadOnly.mjs';

const observedAt='2026-10-27T16:17:00.000Z';
const now=()=>Date.parse('2026-10-27T16:20:00.000Z');

test('ECOS account snapshot preserves reported TH/s but never promotes it to allocatable capacity',()=>{
  const snapshot=normalizeEcosSnapshot({
    source:'ECOS_ACCOUNT_APP',
    observedAt,
    account:{totalPowerTh:600,minedTodayBtc:0,minedAllTimeBtc:0,walletBalanceBtc:0.00000004},
    transaction:{id:'126625539',type:'BUYING_CONTRACT',amountBtc:-0.00012398,occurredAt:'2026-10-27T15:46:00.000Z'}
  },{now});
  assert.equal(snapshot.capacity.reportedHashrateTh,600);
  assert.equal(snapshot.capacity.independentlyVerified,false);
  assert.equal(snapshot.capacity.authoritativeForHashrate,false);
  assert.equal(snapshot.capacity.allocatableHashrateTh,null);
  assert.equal(snapshot.capacity.eligibleForNeoCapacity,false);
  assert.equal(snapshot.authoritativeForSettlement,false);
  assert.equal(snapshot.authoritativeForTokenIssuance,false);
});

test('reported active contract is still marked unverified',()=>{
  const snapshot=normalizeEcosSnapshot({
    source:'ECOS_PERSONAL_ACCOUNT_EXPORT',
    observedAt,
    account:{totalPowerTh:600},
    contract:{contractId:'example-contract',status:'ACTIVE',hashrateTh:600,termDays:1}
  },{now});
  assert.equal(snapshot.contractReportedActive,true);
  assert.equal(snapshot.status,'CONTRACT_REPORTED_ACTIVE_UNVERIFIED');
  assert.equal(snapshot.providerApiConnected,false);
});

test('secret-bearing account material is rejected',()=>{
  assert.throws(()=>normalizeEcosSnapshot({
    source:'ECOS_ACCOUNT_APP',
    observedAt,
    account:{totalPowerTh:600},
    sessionToken:'do-not-store'
  },{now}),/SECRET_FIELD_FORBIDDEN/);
});

test('stale snapshots cannot report connected status',()=>{
  const env={ECOS_ACCOUNT_SNAPSHOT_JSON:JSON.stringify({
    source:'ECOS_ACCOUNT_APP',
    observedAt:'2026-10-25T00:00:00.000Z',
    account:{totalPowerTh:600}
  })};
  const status=ecosDevelopmentStatus({env,now});
  assert.equal(status.connected,false);
  assert.equal(status.stale,true);
  assert.equal(status.eligibleForNeoCapacity,false);
});

test('invalid or oversized JSON fails closed',()=>{
  assert.throws(()=>parseEcosSnapshotJson('{bad json'),/JSON_INVALID/);
  assert.throws(()=>parseEcosSnapshotJson(' '.repeat(40000)),/TOO_LARGE/);
});
