import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeoFirestoreStore } from './firestore-store.mjs';

function createFakeDb() {
  const rows = new Map();
  return {
    collection(name) {
      return {
        doc(id) {
          const key = `${name}/${id}`;
          return {
            async get() {
              return { exists: rows.has(key), id, data: () => rows.get(key) };
            },
            async set(value, { merge } = {}) {
              rows.set(key, merge ? { ...(rows.get(key) || {}), ...value } : value);
            },
            async delete() { rows.delete(key); }
          };
        }
      };
    },
    async runTransaction(work) {
      return work({});
    }
  };
}

test('store requires injected Firestore-compatible db', () => {
  assert.throws(() => createNeoFirestoreStore(), /firestore_db_required/);
});

test('store persists namespaced documents', async () => {
  const store = createNeoFirestoreStore({ db: createFakeDb(), namespace: 'neo', now: () => '2026-09-09T00:00:00.000Z' });
  await store.set('services', 'router', { status: 'ready' });
  assert.deepEqual(await store.get('services', 'router'), { id: 'router', status: 'ready', updatedAt: '2026-09-09T00:00:00.000Z' });
});

test('store deletes documents', async () => {
  const store = createNeoFirestoreStore({ db: createFakeDb() });
  await store.set('registry', 'x', { ok: true });
  await store.delete('registry', 'x');
  assert.equal(await store.get('registry', 'x'), null);
});
