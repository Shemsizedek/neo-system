import assert from 'node:assert/strict';

const base = 'https://neo-nous-os-db-staging.onrender.com';
const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if (!requestUrl || !requestToken) throw new Error('github_oidc_permission_required');
const provider = await fetch(requestUrl + (requestUrl.includes('?') ? '&' : '?') + 'audience=neo-nous-staging-ci', {
  headers: { authorization: 'bearer ' + requestToken },
  signal: AbortSignal.timeout(15000),
});
assert.equal(provider.status, 200, 'GitHub OIDC provider unavailable');
const issued = await provider.json();
const token = issued.value;
assert.ok(typeof token === 'string' && token.split('.').length === 3, 'OIDC token missing');
const headers = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
const task = { requestId: 'NOUS-CI-HOSTED-1388-1', agentId: 'NIA-008', capability: 'development.plan' };

async function post(body, authorization = headers.authorization) {
  const res = await fetch(base + '/v1/staging/receipts/plan', {
    method: 'POST', headers: { ...headers, authorization },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  return { status: res.status, data: await res.json() };
}
const first = await post(task);
assert.equal(first.status, 200, 'signed hosted receipt creation failed: ' + first.data?.error);
assert.equal(first.data.requestId, task.requestId);
assert.equal(first.data.agentId, task.agentId);
assert.equal(first.data.capability, task.capability);
assert.equal(first.data.execution, 'disabled');
assert.equal(first.data.subject, 'github-actions-nous-staging');

const replay = await post(task);
assert.equal(replay.status, 200);
assert.deepEqual(replay.data, first.data, 'hosted persisted receipt is not idempotent');

const conflict = await post({ ...task, capability: 'project.plan' });
assert.equal(conflict.status, 409);
assert.equal(conflict.data.error, 'nous_request_id_conflict');

const forged = await post({ ...task, requestId: 'NOUS-CI-INVALID' }, 'Bearer malformed');
assert.equal(forged.status, 401);

console.log('HOSTED_OIDC_PASS: signed GitHub workflow token verified, receipt idempotent and conflict denied, no external action executed');
console.log('RECEIPT_ID=' + first.data.receiptId);
