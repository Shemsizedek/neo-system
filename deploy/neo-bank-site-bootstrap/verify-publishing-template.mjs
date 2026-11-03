import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const template = readFileSync('deploy/neo-bank-site-bootstrap/pages.yml', 'utf8');
assert.ok(template.includes('actions/deploy-pages@v4'), 'dedicated publishing template missing deploy action');
assert.ok(template.includes('index.html preview.css preview.js site-status.json'), 'frontend asset list incomplete');
assert.equal(existsSync('CNAME'), false, 'root domain ownership must remain separate');
assert.equal(existsSync('apps/neo-bank-pages/CNAME'), false, 'bank preview must not claim a custom domain');
const status = JSON.parse(readFileSync('apps/neo-bank-pages/site-status.json', 'utf8'));
assert.equal(status.financialWrites, false);
assert.equal(status.accountServices, false);
console.log('NEO Bank publishing template and single-host protections verified');
