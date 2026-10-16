import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDealDeskPath, rewriteLocation } from './server.mjs';

test('maps portal entry to Deal Desk',()=>{
  assert.equal(mapDealDeskPath('/portal'),'/portal/deal-desk');
  assert.equal(mapDealDeskPath('/ui'),'/portal/deal-desk');
  assert.equal(mapDealDeskPath('/api/v1/deal-desk/snapshot'),'/api/v1/deal-desk/snapshot');
});

test('rewrites eGov absolute redirects to public Deal Desk host',()=>{
  assert.equal(rewriteLocation('https://egov.holytemples.org/portal'),'https://desk.holytemples.org/portal');
  assert.equal(rewriteLocation('/portal'),'/portal');
});
