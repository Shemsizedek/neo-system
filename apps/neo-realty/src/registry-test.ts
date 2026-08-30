import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.NODE_ENV = 'test';
process.env.NEO_REALTY_ADMIN_TOKEN = 'test-admin-token';
process.env.NEO_REALTY_FRONTEND_ORIGIN = '';

const { createApp } = await import('./server.js');
const server = createApp().listen(0);
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('server_not_listening');
const base = `http://127.0.0.1:${address.port}`;

try {
  const createdResponse = await fetch(`${base}/properties`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      listingType: 'sale',
      propertyType: 'house',
      address: {
        line1: '144 NEO Way',
        city: 'Houston',
        region: 'TX',
        postalCode: '77002',
        country: 'US'
      },
      pricing: { askingFiat: 500000, fiatCurrency: 'USD', displayWorldCurrency: '∞500000' },
      authority: { claimStatus: 'verified' },
      neo: { neoPadsEligible: true, homeSharesEnabled: true, settlementAssets: ['BTC','XCP','NOMNI'] }
    })
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json() as any;
  assert.equal(created.data.status, 'pending_verification');
  assert.equal(created.data.authority.claimStatus, 'pending');
  const id = created.data.id as string;

  const hiddenBeforeApproval = await fetch(`${base}/properties`);
  const hiddenBody = await hiddenBeforeApproval.json() as any;
  assert.equal(hiddenBody.count, 0);

  const unauthenticatedApproval = await fetch(`${base}/admin/properties/${id}/authority`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision: 'verified' })
  });
  assert.equal(unauthenticatedApproval.status, 401);

  const approvedResponse = await fetch(`${base}/admin/properties/${id}/authority`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-admin-token'
    },
    body: JSON.stringify({ decision: 'verified', verificationMethod: 'document_review' })
  });
  assert.equal(approvedResponse.status, 200);
  const approved = await approvedResponse.json() as any;
  assert.equal(approved.data.status, 'active');
  assert.equal(approved.data.authority.claimStatus, 'verified');

  const visibleAfterApproval = await fetch(`${base}/properties?q=Houston&listingType=sale&propertyType=house`);
  const visibleBody = await visibleAfterApproval.json() as any;
  assert.equal(visibleBody.count, 1);
  assert.equal(visibleBody.data[0].id, id);

  console.log('NEO Realty registry trust-boundary test passed');
} finally {
  server.close();
}
