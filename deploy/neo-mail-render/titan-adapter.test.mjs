import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titanConfig, latestTitanMessages } from './titan-adapter.mjs';

test('refuses missing secrets and arbitrary IMAP hosts', () => {
  assert.throws(() => titanConfig({}), /not_configured/);
  assert.throws(() => titanConfig({ TITAN_IMAP_USER:'a',TITAN_IMAP_APP_PASSWORD:'b',TITAN_IMAP_HOST:'attacker.example' }), /unsupported/);
});
test('requires SSL/TLS and secret-supplied configuration', () => {
  const c=titanConfig({TITAN_IMAP_USER:'test@example.com',TITAN_IMAP_APP_PASSWORD:'placeholder'});
  assert.equal(c.secure,true);
  assert.equal(c.port,993);
  assert.equal(c.tls.rejectUnauthorized,true);
});
test('reads bounded inbox using read-only lock and closes session', async () => {
  let locked=false, closed=false;
  const result=await latestTitanMessages({
    config: {},
    clientFactory: async () => ({
      mailbox:{exists:2},
      connect: async()=>{},
      getMailboxLock: async (box, opts)=>{ assert.equal(box,'INBOX'); assert.equal(opts.readOnly,true); return {release:()=>{locked=true;}}; },
      fetch: async function* () { yield {uid:5,envelope:{subject:'Test fixture',from:[{address:'test@example.org'}]},internalDate:new Date('2026-10-18T00:00:00Z')}; },
      logout:async()=>{closed=true;}
    })
  });
  assert.equal(result.length,1);assert.equal(result[0].uid,5);assert.equal(locked,true);assert.equal(closed,true);
});
