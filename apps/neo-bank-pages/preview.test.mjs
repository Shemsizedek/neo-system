import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const base = new URL('./', import.meta.url);
const text = (path) => readFile(new URL(path, base), 'utf8');

test('simplified NEO Bank has four clear navigation destinations', async () => {
  const page = await text('index.html');
  for (const section of ['home', 'accounts', 'community', 'activity']) {
    assert.match(page, new RegExp('data-view="' + section + '"'));
    assert.match(page, new RegExp('data-section="' + section + '"'));
  }
  assert.equal((page.match(/class="tab(?: is-active)?"/g) || []).length, 4);
  for (const removed of ['overview', 'exchange', 'markets', 'integrations']) {
    assert.doesNotMatch(page, new RegExp('data-section="' + removed + '"'));
  }
  assert.match(page, /NEO Bank \| Community Finance/);
  assert.match(page, /href="\.\/preview\.css"/);
  assert.match(page, /src="\.\/preview\.js"/);
  assert.doesNotMatch(page, /href="\/preview\.css"|src="\/preview\.js"/);
});

test('home is useful and clear before any bank connection exists', async () => {
  const page = await text('index.html');
  assert.match(page, /Banking services are not open yet/);
  assert.match(page, /Sign-in, balances, and transfers are unavailable/);
  assert.match(page, /data-open="accounts"/);
  assert.match(page, /data-open="community"/);
  assert.match(page, /data-open="activity"/);
  assert.match(page, /id="refreshStatus"/);
  assert.match(page, /id="runtimeStatus"/);
  assert.match(page, /id="bankStatus"/);
  assert.match(page, /Not connected yet/);
  assert.match(page, /Transfers are not available/);
});

test('every section stays read-only without false financial capability', async () => {
  const page = await text('index.html');
  assert.doesNotMatch(page, /<form\b|type="password"|\bNMNIBANK\b|CES_SOURCE_DATABASE_URL|\$[0-9][0-9,.]*|\.\.\.\/\.env/i);
  assert.match(page, /Available balance/);
  assert.match(page, /Not available/);
  assert.match(page, /No verified activity to show/);
  assert.match(page, /No listings connected/);
  assert.match(page, /rel="noopener noreferrer" target="_blank"/);
});

test('client navigation preserves previous hash routes and never calls bank APIs', async () => {
  const js = await text('preview.js');
  assert.match(js, /showSection/);
  assert.match(js, /hashchange/);
  assert.match(js, /overview: 'home'/);
  assert.match(js, /exchange: 'community'/);
  assert.match(js, /markets: 'community'/);
  assert.match(js, /fetch\('\.\/site-status\.json'/);
  assert.match(js, /status\.accountServices === false && status\.financialWrites === false/);
  assert.doesNotMatch(js, /\/api\/v1\/transfers|\/api\/v1\/auth|localStorage|sessionStorage|document\.cookie|eval\(/);
});

test('layout is mobile friendly, low-motion friendly and keyboard reachable', async () => {
  const css = await text('preview.css');
  const html = await text('index.html');
  assert.match(css, /@media \(max-width:750px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(html, /href="#main">Skip to content/);
  assert.match(html, /aria-label="Main navigation"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-view="accounts"[^>]*hidden/);
});

test('public Pages status still forbids financial operations', async () => {
  const status = JSON.parse(await text('site-status.json'));
  assert.equal(status.mode, 'read-only-preview');
  assert.equal(status.accountServices, false);
  assert.equal(status.financialWrites, false);
  assert.equal(status.database, 'not_attached');
});
