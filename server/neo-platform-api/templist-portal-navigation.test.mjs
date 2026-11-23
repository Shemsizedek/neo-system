import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplistPortal } from './templist-portal.mjs';

test('Templist links to the registered school and identity entry points', () => {
  const html = renderTemplistPortal();
  assert.match(html, /href="https:\/\/school\.holytemples\.org\/"/);
  assert.match(html, /href="https:\/\/neopass\.holytemples\.org\/"/);
});

test('Google identity UI remains disabled without client configuration', () => {
  const html = renderTemplistPortal();
  assert.match(html, /Administrator configuration pending/);
  assert.doesNotMatch(html, /data-client_id=/);
  const enabled = renderTemplistPortal({googleClientId:'test-client'});
  assert.match(enabled, /data-client_id="test-client"/);
});
