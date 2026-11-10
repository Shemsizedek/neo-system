import assert from 'node:assert/strict';

const base = 'https://neo-nous-os-db-staging.onrender.com';
const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if (!requestUrl || !requestToken) throw new Error('github_oidc_permission_required');
const provider = await fetch(requestUrl + (requestUrl.includes('?') ? '&' : '?') + 'audience=neo-nous-staging-ci', {
  headers: { authorization: 'bearer ' + requestToken }, signal: AbortSignal.timeout(15000),
});
assert.equal(provider.status, 200, 'GitHub OIDC provider unavailable');
const issued = await provider.json();
const token = issued.value;
assert.ok(typeof token === 'string' && token.split('.').length === 3, 'OIDC token missing');
const task = { requestId: 'CI-P144-PR1388-HOSTED-REPLAY-01' };
async function post(body, authorization = 'Bearer ' + token) {
  const res = await fetch(base + '/v1/staging/receipt', {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  return { status: res.status, data: await res.json() };
}
const first = await post(task);
assert.equal(first.status, 200, 'signed hosted receipt creation failed: ' + first.data?.error);
assert.equal(first.data.requestId, task.requestId);
assert.equal(first.data.agentId, 'NIA-008');
assert.equal(first.data.capability, 'development.plan');
assert.equal(first.data.execution, 'disabled');
assert.equal(first.data.subject, 'github-actions-nous-staging');
const replay = await post(task);
assert.equal(replay.status, 200);
assert.deepEqual(replay.data, first.data, 'hosted persisted receipt is not idempotent');
const invalidInput = await post({ ...task, capability: 'finance.transfer' });
assert.equal(invalidInput.status, 400, 'staging must deny user-chosen capability');
const forged = await post({ requestId: 'CI-P144-OTHER' }, 'Bearer malformed');
assert.equal(forged.status, 401);
console.log('HOSTED_OIDC_PASS: signed GitHub workflow token verified, Neon receipt replay passed; no external action executed');
console.log('RECEIPT_ID=' + first.data.receiptId);
