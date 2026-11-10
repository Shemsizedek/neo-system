import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirestoreTempleRegistry } from './firestore-temple-registry.mjs';

const epoch = 1780000000;
function fakeDb(original) {
  let record = { ...original };
  let writes = 0;
  const ref = { id: 'record-1' };
  const db = {
    collection: () => ({
      where: () => ({ limit: () => ({ get: async () => ({
        empty: !record, docs: record ? [{ id: ref.id, data: () => record }] : [],
      }) }) }),
      doc: () => ref,
    }),
    async runTransaction(fn) {
      return fn({
        get: async () => ({ exists: Boolean(record), data: () => ({ ...record }) }),
        set: (_ref, updates, options) => {
          assert.equal(options.merge, true);
          record = { ...record, ...updates };
          writes++;
        },
      });
    },
    get state() { return record; },
    get writes() { return writes; },
  };
  return db;
}
const active = { subject: 'google:sample', status: 'active', username: 'sample', role: 'member' };

test('atomic consent preserves credential identity and never changes roles', async () => {
  const db = fakeDb(active);
  const registry = createFirestoreTempleRegistry({ db });
  const grant = await registry.setNEOpassNousAccess('google:sample', {
    enabled: true, sessionIssuedAt: epoch - 10, nowEpochSeconds: epoch,
  });
  assert.equal(grant.nousAccessEnabled, true);
  assert.equal(grant.nousAccessExpiresAt, new Date((epoch + 86400) * 1000).toISOString());
  assert.equal(db.state.role, 'member');
  assert.equal(db.writes, 1);
  const revoke = await registry.setNEOpassNousAccess('google:sample', {
    enabled: false, sessionIssuedAt: epoch - 10, nowEpochSeconds: epoch + 1,
  });
  assert.equal(revoke.nousAccessEnabled, false);
  assert.equal(db.state.sessionRevokedAfter, epoch + 1);
  await assert.rejects(registry.setNEOpassNousAccess('google:sample', {
    enabled: true, sessionIssuedAt: epoch, nowEpochSeconds: epoch + 2,
  }), /neopass_session_revoked/);
  assert.equal(db.writes, 2);
});

test('missing, inactive and replayed records fail closed', async () => {
  for (const record of [null, { ...active, status: 'pending' }, { ...active, suspended: true }]) {
    const db = fakeDb(record);
    const registry = createFirestoreTempleRegistry({ db });
    await assert.rejects(registry.setNEOpassNousAccess('google:sample', {
      enabled: true, sessionIssuedAt: epoch - 10, nowEpochSeconds: epoch,
    }), /nous_credential_not_found|nous_member_not_active/);
    assert.equal(db.writes, 0);
  }
  const db = fakeDb(active);
  const registry = createFirestoreTempleRegistry({ db });
  await assert.rejects(registry.setNEOpassNousAccess('google:sample', {
    enabled: true, sessionIssuedAt: epoch - 1000, nowEpochSeconds: epoch,
  }), /nous_consent_invalid_input/);
});
