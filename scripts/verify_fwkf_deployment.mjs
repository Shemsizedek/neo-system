#!/usr/bin/env node
// FWKF-008: verify the *actual recovered website* is live, not the temporary shell.
// Run only against an authorized https:// preview or worldcafe.holytemples.org.
import assert from 'node:assert/strict';
const base = (process.argv[2] || 'https://fwkf-worldcafe-staging.onrender.com').replace(/\/$/, '');
const target = new URL(base);
if (target.protocol !== 'https:') throw Error('HTTPS URL required');
if (target.hostname !== 'fwkf-worldcafe-staging.onrender.com' && target.hostname !== 'worldcafe.holytemples.org')
  throw Error('Unapproved FWKF deployment host');
async function fetchChecked(path, marker) {
  const response = await fetch(new URL(path, base), { redirect: 'error', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, path + ' must return HTTP 200');
  assert.ok((response.headers.get('content-type') || '').length, path + ' lacks content type');
  const body = await response.text();
  if (marker) assert.ok(body.includes(marker), path + ' missing marker: ' + marker);
  return body;
}
const html = await fetchChecked('/', 'Free World Knowledge Foundation');
assert.ok(html.includes('/assets/index-C6xF2f0w.js'), 'Archived React bundle not deployed; staging shell is insufficient');
assert.ok(html.includes('/assets/index-CECYfagt.css'), 'Archived CSS not deployed');
assert.ok(html.includes('noindex,nofollow'), 'Non-indexing safety guard absent');
assert.ok(html.includes('/fwkf-release-guard.js'), 'Form guard not referenced');
assert.ok(!html.includes('interim deployment shell'), 'Temporary shell still active');
await fetchChecked('/assets/index-C6xF2f0w.js');
await fetchChecked('/assets/index-CECYfagt.css');
await fetchChecked('/fwkf-release-guard.js', 'Contact submissions are temporarily unavailable');
await fetchChecked('/favicon.svg');
await fetchChecked('/icons.svg');
await fetchChecked('/robots.txt', 'Disallow: /');
console.log(JSON.stringify({host:target.hostname,verified:true,checks:8,productionAuthorized:false},null,2));
