import assert from 'node:assert/strict';

const base = 'https://neo-nous-os-db-staging.onrender.com';
const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if (!requestUrl || !requestToken) throw new Error('github_oidc_permission_required');

const provider = await fetch(requestUrl + (requestUrl.includes('?') ? '&' : '?') + 'audience=neo-nous-staging-ci', {
  headers: { authorization: 'Bearer ' + requestToken },
  signal: AbortSignal.timeout(15000),
});
assert.equal(provider.status, 200, 'GitHub OIDC token unavailable');
const issued = await provider.json();
const token = issued.value;
assert.ok(typeof token === 'string' && token.split('.').length === 3, 'OIDC JWT missing');

const request = { requestId: 'CI-P144-PR1388-STAGING-01' };
async function post(body, authorization = 'Bearer ' + token) {
  const response = await fetch(base + '/v1/staging/receipt', {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  return { status: response.status, data: await response.json() };
}

const first = await post(request);
assert.equal(first.status, 200, 'signed hosted receipt creation failed: ' + first.data?.error);
assert.equal(first.data.requestId, request.requestId);
assert.equal(first.data.agentId, 'NIA-008');
assert.equal(first.data.capability, 'development.plan');
assert.equal(first.data.execution, 'disabled');
assert.equal(first.data.subject, 'github-actions-nous-staging');

const replay = await post(request);
assert.equal(replay.status, 200);
assert.deepEqual(replay.data, first.data, 'hosted persisted receipt is not idempotent');

const forbidden = await post({ ...request, capability: 'finance.transfer' });
assert.equal(forbidden.status, 400, 'OIDC must not choose a sensitive capability');

const malformed = await post({ requestId: 'CI-P144-INVALID' }, 'Bearer malformed');
assert.equal(malformed.status, 401, 'invalid signature must fail closed');

console.log('HOSTED_OIDC_PASS: short-lived GitHub identity, fixed planning receipt, persistence/replay, capability denial');
console.log('RECEIPT_ID=' + first.data.receiptId);
