import assert from 'node:assert/strict';
import { once } from 'node:events';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.NEO_REALTY_ADMIN_TOKEN = 'test-admin-token';
process.env.NEO_REALTY_SELLER_SESSION_SECRET = 'seller-test-secret';
process.env.NEO_REALTY_FRONTEND_ORIGIN = '';

const { createApp } = await import('./server.js');
const server = createApp().listen(0);
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('server_not_listening');
const base = `http://127.0.0.1:${address.port}`;

function createSellerToken(sellerId: string, role: 'seller' | 'agent' = 'seller'): string {
  const payload = Buffer.from(JSON.stringify({
    sub: sellerId,
    role,
    exp: Math.floor(Date.now() / 1000) + 300
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.NEO_REALTY_SELLER_SESSION_SECRET!)
    .update(payload)
    .digest('base64url');
  return `Bearer ${payload}.${signature}`;
}

try {
  // Create two properties for testing
  const property1Response = await fetch(`${base}/properties`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      listingType: 'sale',
      propertyType: 'house',
      address: {
        line1: '100 Main St',
        city: 'Austin',
        region: 'TX',
        postalCode: '78701',
        country: 'US'
      },
      pricing: { askingFiat: 400000, fiatCurrency: 'USD' }
    })
  });
  assert.equal(property1Response.status, 201);
  const property1 = await property1Response.json() as any;
  const property1Id = property1.data.id as string;

  const property2Response = await fetch(`${base}/properties`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      listingType: 'sale',
      propertyType: 'condo',
      address: {
        line1: '200 Oak Ave',
        city: 'Dallas',
        region: 'TX',
        postalCode: '75201',
        country: 'US'
      },
      pricing: { askingFiat: 300000, fiatCurrency: 'USD' }
    })
  });
  assert.equal(property2Response.status, 201);
  const property2 = await property2Response.json() as any;
  const property2Id = property2.data.id as string;

  // Approve both properties
  await fetch(`${base}/admin/properties/${property1Id}/authority`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-admin-token'
    },
    body: JSON.stringify({ decision: 'verified', verificationMethod: 'document_review' })
  });

  await fetch(`${base}/admin/properties/${property2Id}/authority`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-admin-token'
    },
    body: JSON.stringify({ decision: 'verified', verificationMethod: 'document_review' })
  });

  const seller1Token = createSellerToken('seller-001');
  const seller2Token = createSellerToken('seller-002');

  // TEST 1: Verify the self-claim endpoint no longer exists
  console.log('TEST 1: Verify self-claim endpoint is removed');
  const claimAttempt = await fetch(`${base}/seller/properties/${property1Id}/claim`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: seller1Token
    }
  });
  // Should return 404 since the route no longer exists
  assert.equal(claimAttempt.status, 404, 'Self-claim endpoint should not exist');
  console.log('✓ Self-claim endpoint correctly removed');

  // TEST 2: Verify seller cannot access media for unowned property
  console.log('\nTEST 2: Verify seller cannot access media for unowned property');
  const unauthorizedMediaGet = await fetch(`${base}/seller/properties/${property1Id}/media`, {
    headers: { authorization: seller1Token }
  });
  assert.equal(unauthorizedMediaGet.status, 403, 'Should reject access to unowned property media');
  const unauthorizedBody = await unauthorizedMediaGet.json() as any;
  assert.equal(unauthorizedBody.error, 'listing_not_owned');
  console.log('✓ Seller correctly denied access to unowned property media');

  // TEST 3: Verify seller cannot add media to unowned property
  console.log('\nTEST 3: Verify seller cannot add media to unowned property');
  const unauthorizedMediaPost = await fetch(`${base}/seller/properties/${property1Id}/media`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: seller1Token
    },
    body: JSON.stringify({
      kind: 'image',
      reference: 'https://example.com/photo.jpg',
      visibility: 'private'
    })
  });
  assert.equal(unauthorizedMediaPost.status, 403, 'Should reject adding media to unowned property');
  const unauthorizedPostBody = await unauthorizedMediaPost.json() as any;
  assert.equal(unauthorizedPostBody.error, 'listing_not_owned');
  console.log('✓ Seller correctly denied adding media to unowned property');

  // TEST 4: Verify only admin can assign properties
  console.log('\nTEST 4: Verify only admin can assign properties');
  const unauthorizedAssign = await fetch(`${base}/admin/properties/${property1Id}/assign`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: seller1Token  // Using seller token instead of admin
    },
    body: JSON.stringify({
      principalId: 'seller-001',
      role: 'seller'
    })
  });
  assert.equal(unauthorizedAssign.status, 401, 'Should reject non-admin assignment');
  console.log('✓ Non-admin correctly denied property assignment');

  // TEST 5: Admin can assign property to seller
  console.log('\nTEST 5: Admin can assign property to seller');
  const adminAssign = await fetch(`${base}/admin/properties/${property1Id}/assign`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-admin-token'
    },
    body: JSON.stringify({
      principalId: 'seller-001',
      role: 'seller'
    })
  });
  assert.equal(adminAssign.status, 201, 'Admin should successfully assign property');
  const assignBody = await adminAssign.json() as any;
  assert.equal(assignBody.data.propertyId, property1Id);
  assert.equal(assignBody.data.principalId, 'seller-001');
  assert.equal(assignBody.data.role, 'seller');
  console.log('✓ Admin successfully assigned property to seller');

  // TEST 6: After proper assignment, seller can access their property media
  console.log('\nTEST 6: After proper assignment, seller can access their property media');
  const authorizedMediaGet = await fetch(`${base}/seller/properties/${property1Id}/media`, {
    headers: { authorization: seller1Token }
  });
  assert.equal(authorizedMediaGet.status, 200, 'Should allow access to owned property media');
  const authorizedBody = await authorizedMediaGet.json() as any;
  assert.equal(authorizedBody.count, 0); // No media added yet
  console.log('✓ Seller can access owned property media');

  // TEST 7: Seller can add media to owned property
  console.log('\nTEST 7: Seller can add media to owned property');
  const authorizedMediaPost = await fetch(`${base}/seller/properties/${property1Id}/media`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: seller1Token
    },
    body: JSON.stringify({
      kind: 'image',
      reference: 'https://example.com/owned-photo.jpg',
      visibility: 'private',
      label: 'Interior photo'
    })
  });
  assert.equal(authorizedMediaPost.status, 201, 'Should allow adding media to owned property');
  const mediaBody = await authorizedMediaPost.json() as any;
  assert.equal(mediaBody.data.propertyId, property1Id);
  assert.equal(mediaBody.data.visibility, 'private');
  assert.equal(mediaBody.data.createdBy, 'seller-001');
  console.log('✓ Seller can add media to owned property');

  // TEST 8: Seller still cannot access another seller's property
  console.log('\nTEST 8: Seller still cannot access another seller\'s property');
  const crossSellerAccess = await fetch(`${base}/seller/properties/${property1Id}/media`, {
    headers: { authorization: seller2Token }
  });
  assert.equal(crossSellerAccess.status, 403, 'Should reject cross-seller access');
  const crossSellerBody = await crossSellerAccess.json() as any;
  assert.equal(crossSellerBody.error, 'listing_not_owned');
  console.log('✓ Cross-seller access correctly denied');

  // TEST 9: Verify private media is not exposed in public endpoint
  console.log('\nTEST 9: Verify private media is not exposed in public endpoint');
  const publicMediaGet = await fetch(`${base}/properties/${property1Id}/media`);
  assert.equal(publicMediaGet.status, 200);
  const publicMediaBody = await publicMediaGet.json() as any;
  assert.equal(publicMediaBody.count, 0, 'Private media should not be visible in public endpoint');
  console.log('✓ Private media correctly hidden from public endpoint');

  // TEST 10: Add public media and verify it's visible in public endpoint
  console.log('\nTEST 10: Add public media and verify it\'s visible in public endpoint');
  await fetch(`${base}/seller/properties/${property1Id}/media`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: seller1Token
    },
    body: JSON.stringify({
      kind: 'image',
      reference: 'https://example.com/public-photo.jpg',
      visibility: 'public',
      label: 'Exterior photo'
    })
  });

  const publicMediaGet2 = await fetch(`${base}/properties/${property1Id}/media`);
  assert.equal(publicMediaGet2.status, 200);
  const publicMediaBody2 = await publicMediaGet2.json() as any;
  assert.equal(publicMediaBody2.count, 1, 'Public media should be visible');
  assert.equal(publicMediaBody2.data[0].visibility, 'public');
  console.log('✓ Public media correctly visible in public endpoint');

  // TEST 11: Seller can see both public and private media in seller endpoint
  console.log('\nTEST 11: Seller can see both public and private media in seller endpoint');
  const sellerMediaGet = await fetch(`${base}/seller/properties/${property1Id}/media`, {
    headers: { authorization: seller1Token }
  });
  assert.equal(sellerMediaGet.status, 200);
  const sellerMediaBody = await sellerMediaGet.json() as any;
  assert.equal(sellerMediaBody.count, 2, 'Seller should see both public and private media');
  console.log('✓ Seller can see all media for owned property');

  // TEST 12: Verify assignment requires valid property
  console.log('\nTEST 12: Verify assignment requires valid property');
  const invalidPropertyAssign = await fetch(`${base}/admin/properties/00000000-0000-0000-0000-000000000000/assign`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-admin-token'
    },
    body: JSON.stringify({
      principalId: 'seller-001',
      role: 'seller'
    })
  });
  assert.equal(invalidPropertyAssign.status, 404, 'Should reject assignment to non-existent property');
  console.log('✓ Assignment to non-existent property correctly rejected');

  // TEST 13: Verify assignment requires valid role
  console.log('\nTEST 13: Verify assignment requires valid role');
  const invalidRoleAssign = await fetch(`${base}/admin/properties/${property2Id}/assign`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-admin-token'
    },
    body: JSON.stringify({
      principalId: 'seller-002',
      role: 'invalid-role'
    })
  });
  assert.equal(invalidRoleAssign.status, 400, 'Should reject invalid role');
  const invalidRoleBody = await invalidRoleAssign.json() as any;
  assert.equal(invalidRoleBody.error, 'invalid_assignment');
  console.log('✓ Invalid role correctly rejected');

  // TEST 14: Verify assignment requires principalId
  console.log('\nTEST 14: Verify assignment requires principalId');
  const missingPrincipalAssign = await fetch(`${base}/admin/properties/${property2Id}/assign`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-admin-token'
    },
    body: JSON.stringify({
      principalId: '',
      role: 'seller'
    })
  });
  assert.equal(missingPrincipalAssign.status, 400, 'Should reject empty principalId');
  const missingPrincipalBody = await missingPrincipalAssign.json() as any;
  assert.equal(missingPrincipalBody.error, 'invalid_assignment');
  console.log('✓ Empty principalId correctly rejected');

  // TEST 15: Verify agent role can also be assigned
  console.log('\nTEST 15: Verify agent role can also be assigned');
  const agentToken = createSellerToken('agent-001', 'agent');
  const agentAssign = await fetch(`${base}/admin/properties/${property2Id}/assign`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-admin-token'
    },
    body: JSON.stringify({
      principalId: 'agent-001',
      role: 'agent'
    })
  });
  assert.equal(agentAssign.status, 201, 'Admin should successfully assign property to agent');
  const agentAssignBody = await agentAssign.json() as any;
  assert.equal(agentAssignBody.data.role, 'agent');

  // Verify agent can access the property
  const agentMediaGet = await fetch(`${base}/seller/properties/${property2Id}/media`, {
    headers: { authorization: agentToken }
  });
  assert.equal(agentMediaGet.status, 200, 'Agent should access assigned property');
  console.log('✓ Agent role assignment and access works correctly');

  console.log('\n✅ All seller authorization security tests passed!');
  console.log('\nSummary:');
  console.log('- Self-claim endpoint removed (prevents unauthorized property takeover)');
  console.log('- Sellers cannot access unowned properties');
  console.log('- Only admins can assign properties to sellers/agents');
  console.log('- Proper authorization enforced for media operations');
  console.log('- Private media correctly isolated from public endpoints');
} finally {
  server.close();
}
