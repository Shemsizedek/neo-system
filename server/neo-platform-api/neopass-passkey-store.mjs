import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

// A single-instance durable store. Production must supply a mounted persistent path.
export function createPasskeyStore(path) {
  if (!path) throw Error('neopass_storage_required');
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  if (path !== ':memory:') chmodSync(path, 0o600);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS neopass_accounts (
      subject TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member', status TEXT NOT NULL DEFAULT 'pending');
    CREATE TABLE IF NOT EXISTS neopass_passkeys (
      id TEXT PRIMARY KEY, subject TEXT NOT NULL REFERENCES neopass_accounts(subject),
      public_key BLOB NOT NULL, counter INTEGER NOT NULL, transports TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS neopass_ceremonies (
      id TEXT PRIMARY KEY, purpose TEXT NOT NULL, challenge TEXT NOT NULL,
      payload TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS neopass_sessions (
      id TEXT PRIMARY KEY, subject TEXT NOT NULL REFERENCES neopass_accounts(subject), expires INTEGER NOT NULL);`);
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const account = subject => db.prepare('SELECT * FROM neopass_accounts WHERE subject=?').get(subject);
  const ceremony = (id, purpose, now) => db.prepare('SELECT * FROM neopass_ceremonies WHERE id=? AND purpose=? AND expires>?').get(id, purpose, now);
  function consume(id, purpose, now) {
    const row = ceremony(id, purpose, now);
    if (!row || db.prepare('DELETE FROM neopass_ceremonies WHERE id=?').run(id).changes !== 1) throw Error('passkey_challenge_expired');
    return row;
  }
  return {
    account,
    usernameExists: username => Boolean(db.prepare('SELECT 1 FROM neopass_accounts WHERE username=?').get(username)),
    credential: id => db.prepare('SELECT * FROM neopass_passkeys WHERE id=? AND revoked=0').get(id),
    credentials: subject => db.prepare('SELECT id,transports FROM neopass_passkeys WHERE subject=? AND revoked=0').all(subject),
    ceremony,
    saveCeremony(id, purpose, challenge, payload, now) {
      transaction(() => {
        db.prepare('DELETE FROM neopass_ceremonies WHERE expires<=?').run(now);
        db.prepare('DELETE FROM neopass_sessions WHERE expires<=?').run(now);
        db.prepare('INSERT INTO neopass_ceremonies VALUES (?,?,?,?,?)').run(id, purpose, challenge, JSON.stringify(payload), now + 300000);
      });
    },
    register(id, credential, now) {
      return transaction(() => {
        const row = consume(id, 'register', now), payload = JSON.parse(row.payload);
        // New accounts cannot claim an existing subject or inherit roles from client input.
        if (!payload.existing) db.prepare('INSERT INTO neopass_accounts(subject,username,display_name) VALUES(?,?,?)').run(payload.subject, payload.username, payload.displayName);
        const member = account(payload.subject);
        if (!member || member.status === 'revoked') throw Error('neopass_account_unavailable');
        db.prepare('INSERT INTO neopass_passkeys(id,subject,public_key,counter,transports) VALUES(?,?,?,?,?)').run(credential.id, member.subject, credential.publicKey, credential.counter, JSON.stringify(credential.transports || []));
        return member;
      });
    },
    authenticate(id, credentialId, oldCounter, newCounter, now) {
      return transaction(() => {
        consume(id, 'authenticate', now);
        const result = db.prepare('UPDATE neopass_passkeys SET counter=? WHERE id=? AND counter=? AND revoked=0').run(newCounter, credentialId, oldCounter);
        if (result.changes !== 1) throw Error('passkey_counter_changed');
        const credential = db.prepare('SELECT subject FROM neopass_passkeys WHERE id=?').get(credentialId);
        const member = account(credential.subject);
        if (!member || member.status === 'revoked') throw Error('neopass_account_unavailable');
        return member;
      });
    },
    saveSession(id, subject, expires) { db.prepare('INSERT INTO neopass_sessions VALUES (?,?,?)').run(id, subject, expires); },
    session(id, now) { return db.prepare('SELECT * FROM neopass_sessions WHERE id=? AND expires>?').get(id, now); },
    revokeSession(id) { db.prepare('DELETE FROM neopass_sessions WHERE id=?').run(id); },
    close() { db.close(); }
  };
}
