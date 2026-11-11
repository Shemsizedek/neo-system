import test from 'node:test';
import assert from 'node:assert/strict';
import {captureReadOnlySource,checkReceiptAgainstBytes,correctCounterpartyChannel,
 acquisitionReviewStatus} from '../../server/neo-property-manager/read-only-source-acceptance.mjs';
const fixture=Buffer.from('%PDF-1.7\nThis is only a synthetic test document');
const input={
 assetRef:'ALG-2502-SYNTHETIC',eventId:'EV-0001',sourceFamily:'HCAD_APPRAISAL',
 sourceReference:'SYNTHETIC-EMAIL',sourceBytes:fixture,
 capturedAt:'2026-11-11T04:00:00Z',observedAt:'2026-11-10T16:25:41Z',
 claimedParties:['SYNTHETIC OWNER LLC'],sourceCustodian:'HCAD'
};
test('record hashing accepts original bytes but does not infer certified title',()=>{
 const r=captureReadOnlySource(input);
 assert.equal(r.documentSha256.length,64);
 assert.equal(r.hashVerified,true);
 assert.equal(r.sourceOriginAuthentication,'NEEDS_INDEPENDENT_CHECK');
 assert.equal(r.certifiedInstrumentVerified,false);
 assert.equal(r.corporateControllerVerified,false);
 assert.equal(r.titleTransferred,false);
});
test('byte integrity detects tampering, but does not create title',()=>{
 const r=captureReadOnlySource(input);
 assert.equal(checkReceiptAgainstBytes(r,fixture),true);
 assert.equal(checkReceiptAgainstBytes(r,Buffer.from('%PDF-1.7\nDifferent')),false);
 assert.equal(r.possessoryRightCreated,false);
});
test('matching corporate inquiry contact is not authority to sell',()=>{
 const c=correctCounterpartyChannel({
   companyName:'TeraWatt Infrastructure',email:'bd@terawattinfrastructure.com',
   officialSourceUrl:'https://www.terawattinfrastructure.com/blog/terawatt-infrastructure-accelerates-rollout-of-ev-fleet-charging-solutions-across-inland-empire'});
 assert.equal(c.channelMatched,true);
 assert.equal(c.entityControlEstablished,false);
 assert.equal(c.appropriateAction,'CONFIRM_AUTHORIZED_PROPERTY_REPRESENTATIVE');
});
test('similarly named company domain is not TeraWatt Infrastructure',()=>{
 const c=correctCounterpartyChannel({
   companyName:'TeraWatt Infrastructure',email:'info@terrawatt.com',
   officialSourceUrl:'https://terrawatt.com/contact/'});
 assert.equal(c.channelMatched,false);
});
test('official-looking foreclosure and deed reference do not confer title or debt',()=>{
 const deed=captureReadOnlySource({...input,sourceFamily:'HARRIS_COUNTY_DEED',eventId:'EV-0002'});
 const foreclosure=captureReadOnlySource({...input,sourceFamily:'HARRIS_COUNTY_FORECLOSURE',eventId:'EV-0003'});
 const s=acquisitionReviewStatus([deed,foreclosure]);
 assert.equal(s.foreclosureOrDistressSourcePresent,true);
 assert.equal(s.actualCurrentForeclosureVerified,false);
 assert.equal(s.lenderDebtAvailableForPurchase,false);
 assert.equal(s.propertyEntryAllowed,false);
 assert.equal(s.beneficialControllerIdentified,false);
});
test('validation rejects unsupported record source and empty bytes',()=>{
 assert.throws(()=>captureReadOnlySource({...input,sourceFamily:'CROWN_TITLE_SELF_GRANT'}),/invalid source family/);
 assert.throws(()=>captureReadOnlySource({...input,sourceBytes:Buffer.alloc(0)}),/original source bytes/);
});
