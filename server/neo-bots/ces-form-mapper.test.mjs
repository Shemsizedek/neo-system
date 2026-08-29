import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryCesForms, classifyCesForm, createCesActionAllowlist, buildDryRunSubmission } from './ces-form-mapper.mjs';

test('inventories CES forms and classifies write actions', () => {
  const html = `
    <form id="approveTx" method="post" action="/win/approve.asp">
      <input type="hidden" name="txid" value="123">
      <input type="checkbox" name="approve" value="1">
      <button type="submit" name="submit" value="Approve">Approve</button>
    </form>
    <form method="get" action="/win/virtual.asp">
      <input name="exchange" value="NMNI">
    </form>`;
  const forms = inventoryCesForms(html, { pageUrl: 'https://www.community-exchange.org/win/admin.asp' });
  assert.equal(forms.length, 2);
  assert.equal(forms[0].method, 'POST');
  assert.equal(classifyCesForm(forms[0]), 'transaction-approval');
  assert.equal(classifyCesForm(forms[1]), 'read-only');
});

test('dry-run submission requires exact allowlisted fingerprint', () => {
  const [form] = inventoryCesForms(`
    <form method="post" action="/win/credit.asp">
      <input type="hidden" name="member" value="NMNIBANK">
      <input type="number" name="amount" required>
    </form>`, { pageUrl: 'https://www.community-exchange.org/win/admin.asp' });
  const allowlist = createCesActionAllowlist([{ action: 'ces.vdollars.issue', fingerprint: form.fingerprint }]);
  const dryRun = buildDryRunSubmission({
    action: 'ces.vdollars.issue',
    form,
    values: { amount: 25 },
    allowlist,
  });
  assert.equal(dryRun.dryRun, true);
  assert.match(dryRun.body, /member=NMNIBANK/);
  assert.match(dryRun.body, /amount=25/);
});

test('blocks unapproved or changed forms', () => {
  const [form] = inventoryCesForms('<form method="post" action="/win/a.asp"><input name="x"></form>', { pageUrl: 'https://www.community-exchange.org/' });
  const allowlist = createCesActionAllowlist([]);
  assert.throws(() => buildDryRunSubmission({ action: 'ces.transactions.approve', form, allowlist }), /not allowlisted/);
});
