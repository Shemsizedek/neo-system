import test from "node:test";
import assert from "node:assert/strict";
import {normalizeNomniConstituent, publicConstituentPayload} from "./nomni-constituent-adapter.mjs";
const fixture={constituent_id:"fixture-001",asset_class:"real_estate",valuation_amount:100,valuation_currency:"USD",valuation_timestamp:"2026-10-23T00:00:00Z",pricing_source:"test-only",supporting_evidence_uri:"https://example.org/evidence"};
test("never asserts reserves, verified market data or a calculated index",()=>{const r=normalizeNomniConstituent(fixture);assert.equal(r.verification_status,"unverified");assert.equal(r.index_level,null);assert.equal(r.reserve_backing_verified,false);assert.equal(publicConstituentPayload([fixture]).index_status,"not_calculated");});
test("rejects bad blockchain id and unsupported network",()=>{assert.throws(()=>normalizeNomniConstituent({...fixture,chain:"Bitcoin/Counterparty",asset_id:"NOMNI",issuance_txid:"broken"}));assert.throws(()=>normalizeNomniConstituent({...fixture,chain:"Ethereum"}));});
test("rejects missing sources and negative valuations",()=>{assert.throws(()=>normalizeNomniConstituent({...fixture,pricing_source:""}));assert.throws(()=>normalizeNomniConstituent({...fixture,valuation_amount:-2}));});
