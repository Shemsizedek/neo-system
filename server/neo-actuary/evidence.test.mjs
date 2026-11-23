import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyEvidence,validateQuote} from './evidence.mjs';
test('documentary evidence never qualifies as valued collateral',()=>{const r=classifyEvidence({id:'doc1',type:'SCREENSHOT',sourceId:'upload1'});assert.equal(r.valuationEligible,false);});
test('rejects stale quote',()=>assert.throws(()=>validateQuote({assetId:'BTC',currency:'USD',priceMinor:'100',quoteTime:'2026-10-01T00:00:00Z',asOf:'2026-10-25T00:00:00Z',sourceId:'quote',ownershipEvidenceId:'o1',custodyEvidenceId:'c1'}),/stale/));
