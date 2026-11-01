import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareCesAccountLink, attestCesAccountLink } from './ces-links.mjs';

const pending = () => prepareCesAccountLink({
  neoSubject: 'neo:founder:000001', exchangeId: 'NMNI', externalAccount: 'NMNIBANK'
});

test('CES links begin unverified with no banking or account data permissions', () => {
  const p = pending();
  assert.equal(p.status, 'pending_external_verification');
  assert.deepEqual(p.permissions, { read: false, transfer: false, issuance: false });
  assert.equal(p.exchangeId, 'NMNI');
  assert.throws(() => prepareCesAccountLink({neoSubject:'neo:founder:000001',exchangeId:'UNKNOWN',externalAccount:'ABC123'}));
  assert.throws(() => prepareCesAccountLink({neoSubject:'neo:founder:000001',exchangeId:'NMNI',externalAccount:'@@@'}));
});

test('account number or user-provided verified flag never bypasses external proof', async () => {
  await assert.rejects(attestCesAccountLink(pending(), {verified:true}), /trusted_ces_verification_required/);
  await assert.rejects(attestCesAccountLink(pending(), {verified:true}, {
    verifyCesOwnership: async() => ({verified:false})
  }), /ces_account_verification_failed/);
  await assert.rejects(attestCesAccountLink(pending(), {verified:true}, {
    verifyCesOwnership: async() => ({verified:true,neoSubject:'neo:other:123456',exchangeId:'NMNI',externalAccount:'NMNIBANK',verifiedAt:'2026-11-01T00:00:00Z'})
  }), /ces_account_verification_failed/);
});

test('verified external identifier remains non-transactional and does not carry secrets', async () => {
  const verified = await attestCesAccountLink(pending(), {opaqueProof:'do-not-persist'}, {
    verifyCesOwnership: async input => ({
      verified:true,
      neoSubject:input.neoSubject,exchangeId:input.exchangeId,
      externalAccount:input.externalAccount,verifiedAt:'2026-11-01T00:00:00Z'
    })
  });
  assert.equal(verified.status, 'verified_identifier_only');
  assert.deepEqual(verified.permissions, {read:false,transfer:false,issuance:false});
  assert.doesNotMatch(JSON.stringify(verified), /do-not-persist|password|cookie|token/i);
});
