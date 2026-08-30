import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.NODE_ENV = 'test';
process.env.NEO_REALTY_ADMIN_TOKEN = 'postgres-admin-token';
process.env.NEO_REALTY_FRONTEND_ORIGIN = '';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');

const { createApp } = await import('./server.js');
const server = createApp().listen(0);
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('server_not_listening');
const base = `http://127.0.0.1:${address.port}`;

try {
  const ready = await fetch(`${base}/ready`);
  assert.equal(ready.status, 200);
  const readyBody = await ready.json() as any;
  assert.equal(readyBody.persistence, 'postgres');

  await fetch(`${base}/admin/reset`, {
    method: 'POST',
    headers: { authorization: 'Bearer postgres-admin-token' }
  });

  const createdResponse = await fetch(`${base}/properties`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      listingType: 'sale',
      propertyType: 'multifamily',
      address: {
        line1: '500 Bitcoin Boulevard',
        city: 'Houston',
        region: 'TX',
        postalCode: '77002',
        country: 'US',
        latitude: 29.7604,
        longitude: -95.3698
      },
      facts: { units: 20, occupancyPct: 94, annualNoi: 327371 },
      pricing: { askingFiat: 6000000, fiatCurrency: 'USD', displayWorldCurrency: '∞6000000' },
      neo: { neoPadsEligible: true, counterpartyAsset: 'HOMESHARES', homeSharesEnabled: true, settlementAssets: ['BTC','XCP','NOMNI'] },
      authority: { claimStatus: 'verified' }
    })
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json() as any;
  assert.equal(created.data.status, 'pending_verification');
  assert.equal(created.data.authority.claimStatus, 'pending');
  const id = created.data.id as string;

  const hidden = await fetch(`${base}/properties?q=Houston`);
  assert.equal((await hidden.json() as any).count, 0);

  const approvedResponse = await fetch(`${base}/admin/properties/${id}/authority`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer postgres-admin-token'
    },
    body: JSON.stringify({ decision: 'verified', verificationMethod: 'document_review' })
  });
  assert.equal(approvedResponse.status, 200);
  const approved = await approvedResponse.json() as any;
  assert.equal(approved.data.status, 'active');
  assert.equal(approved.data.authority.claimStatus, 'verified');

  const search = await fetch(`${base}/properties?q=Houston&listingType=sale&propertyType=multifamily`);
  const searchBody = await search.json() as any;
  assert.equal(searchBody.count, 1);
  assert.equal(searchBody.data[0].id, id);
  assert.equal(searchBody.data[0].neo.counterpartyAsset, 'HOMESHARES');

  const detail = await fetch(`${base}/properties/${id}`);
  assert.equal(detail.status, 200);
  const detailBody = await detail.json() as any;
  assert.equal(detailBody.data.id, id);
  assert.equal(detailBody.data.facts.units, 20);
  assert.equal(detailBody.data.address.latitude, 29.7604);

  console.log('NEO Realty Postgres integration flow passed');
} finally {
  server.close();
}
