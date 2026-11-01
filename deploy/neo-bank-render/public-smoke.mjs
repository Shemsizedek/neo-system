// External, credential-free smoke check against the READ-ONLY staging service.
// Never send CES credentials or post account/financial data from this runner.
import assert from 'node:assert/strict';

const origin = 'https://neo-bank-render-staging.onrender.com';
const checks = [
  ['/healthz', 200],
  ['/health', 503],
  ['/api/v1/community/status', 503],
  ['/api/v1/auth/config', 200],
  ['/internal/v1/data-source/status', 401],
  ['/internal/v1/data-source/report', 401],
  ['/api/v1/ces/exchanges', 404],
  ['/api/v1/ces/bridge/status', 404]
];

async function getWithColdStartRetry(path) {
  let last;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(origin + path, {
        method: 'GET',
        redirect: 'manual',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(30000)
      });
      return response;
    } catch (error) {
      last = error;
      if (attempt !== 4) await new Promise(resolve => setTimeout(resolve, 7000));
    }
  }
  throw last;
}

for (const [path, expected] of checks) {
  const response = await getWithColdStartRetry(path);
  console.log(path + ': HTTP ' + response.status + ', expected ' + expected);
  assert.equal(response.status, expected, path);
  assert.equal(new URL(response.url).origin, origin, 'unexpected redirect or origin');
  const body = await response.json();
  if (path === '/healthz') {
    assert.equal(body.ok, true);
    assert.equal(body.bankOperational, false);
  } else if (path === '/api/v1/auth/config') {
    assert.equal(body.enabled, false);
  } else if (path.startsWith('/internal/')) {
    assert.equal(body.error, 'authentication_required');
  } else if (path === '/health') {
    assert.equal(body.ok, false);
  } else if (path === '/api/v1/community/status') {
    assert.equal(body.accountServices, false);
  }
}
console.log('Read-only external bank staging smoke checks passed.');
