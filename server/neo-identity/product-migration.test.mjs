import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const SUBJECT = 'neo:founder:000001';

async function text(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

test('NEO Guardian Android package binds canonical founder principal without auth bypass', async () => {
  const manifest = await text('apps/neo-guardian/app/src/main/AndroidManifest.xml');
  assert.match(manifest, new RegExp(SUBJECT.replaceAll(':', '\\:')));
  assert.match(manifest, /ACCOUNT_ORDINAL[^\n]*android:value="1"/);
  assert.match(manifest, /BOOTSTRAP_ROLE[^\n]*android:value="founder_owner"/);
  assert.match(manifest, /AUTHENTICATION_BYPASS[^\n]*android:value="false"/);
});

test('Guardian public trust surface resolves shared founder registry', async () => {
  const page = await text('public/guardian/index.html');
  assert.match(page, /Founder Account #1/);
  assert.match(page, /api\/identity\/founder\.json/);
  assert.match(page, new RegExp(SUBJECT.replaceAll(':', '\\:')));
});

test('NEO Hub resolves Account #1 from shared founder registry', async () => {
  const hub = await text('docs/neo-hub/index.html');
  assert.match(hub, /Founder Account #1/);
  assert.match(hub, /api\/identity\/founder\.json/);
  assert.match(hub, new RegExp(SUBJECT.replaceAll(':', '\\:')));
});
