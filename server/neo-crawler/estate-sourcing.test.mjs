import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDelimitedLine, normalizeHcadProperty, normalizeApprovedCaseLink, buildEstatePilot, createEstateOfflineAdapter } from './estate-sourcing.mjs';
import { runCli } from '../../scripts/neo-estate-pilot.mjs';

async function fixtures() {
  const dir = await mkdtemp(join(tmpdir(), 'neo-estate-test-'));
  const property = join(dir, 'hcad.tsv');
  const cases = join(dir, 'authorized-case-links.csv');
  await writeFile(property, 'acct\tsite_addr_1\tstate_class\ttot_appr_val\towner_name\n000100\t100 TEST LANE\tA1\t210000\tTEST PERSON\n000200\t200 TEST WAY\tB1\t220000\tOTHER PERSON\n000100\t100 TEST LANE\tA1\t210000\tTEST PERSON\n');
  await writeFile(cases, 'parcel_account,case_number,court_record_url,filed_date,heirs_label\n000100,PB-EXAMPLE-1,https://example.org/probate/1,2026-11-01,no heirs\n000200,PB-EXAMPLE-2,,2026-11-10,unknown\n999999,PB-NOT-MATCHED,https://example.org/probate/3,2026-11-07,none\n');
  return { dir, property, cases };
}

test('quoted TSV/CSV parser preserves escaped delimiters', () => {
  assert.deepEqual(parseDelimitedLine('"Estate, Example",one'), ['Estate, Example', 'one']);
  assert.deepEqual(parseDelimitedLine('"A""B",next'), ['A"B', 'next']);
  assert.throws(() => parseDelimitedLine('"unfinished'), /unterminated/);
});
test('missing parcel and unsafe case URL never masquerade as verified evidence', () => {
  assert.equal(normalizeHcadProperty({ site_addr_1: 'Example' }), null);
  const c = normalizeApprovedCaseLink({ parcel_account: '1', case_number: 'C', court_record_url: 'http://unsafe.com/', filed_date: 'invalid' });
  assert.equal(c.court_record_url, null); assert.equal(c.filing_date, null);
});
test('pilot joins only explicit parcel IDs and never infers heirs, owner authority or a listing', async () => {
  const f = await fixtures();
  const r = await buildEstatePilot({ propertyPath: f.property, caseLinksPath: f.cases, snapshotAt: '2026-11-15T12:00:00Z' });
  assert.equal(r.counts.input_properties, 3);
  assert.equal(r.counts.matched_candidates, 2);
  assert.equal(r.counts.returned_candidates, 2);
  assert.equal(r.candidates[0].parcel_id, '000100');
  assert.equal(r.candidates[0].evidence_score, 45);
  assert.equal(r.candidates[1].evidence_score, 20);
  for (const c of r.candidates) {
    assert.equal(c.estate_filing_verified, false);
    assert.equal(c.case_to_parcel_match_verified, false);
    assert.equal(c.known_heirs_status, 'unknown');
    assert.equal(c.listed_for_sale_verified, false);
    assert.equal(c.authorized_seller_verified, false);
    assert.equal(c.outreach_approved, false);
    assert.equal(c.price_basis, 'appraisal_only_not_an_offer');
  }
  assert.equal(JSON.stringify(r).includes('TEST PERSON'), false);
  assert.equal(JSON.stringify(r).includes('no heirs'), false);
  assert.equal(r.production_import_permitted, false);
  assert.match(r.input_sources.hcad_property_data.sha256, /^[0-9a-f]{64}$/);
});
test('missing case input does not classify HCAD records as estate opportunities', async () => {
  const f = await fixtures();
  await writeFile(f.cases, 'parcel_account,case_number,court_record_url,filed_date\n');
  const r = await buildEstatePilot({ propertyPath: f.property, caseLinksPath: f.cases });
  assert.equal(r.counts.matched_candidates, 0);
});
test('import fails closed on malformed source rows', async () => {
  const f = await fixtures();
  await writeFile(f.property, 'acct\tsite_addr_1\n0001\n');
  await assert.rejects(buildEstatePilot({ propertyPath: f.property, caseLinksPath: f.cases }), /malformed_row_at_2/);
});
test('CLI writes a private, creation-only local report', async () => {
  const f = await fixtures();
  const out = join(f.dir, 'private-output.json');
  const summary = await runCli(['--hcad', f.property, '--case-links', f.cases, '--out', out]);
  assert.equal(summary.production_import_permitted, false);
  const raw = JSON.parse(await readFile(out, 'utf8'));
  assert.equal(raw.leads_contacted, 0);
  await assert.rejects(runCli(['--hcad', f.property, '--case-links', f.cases, '--out', out]), /EEXIST/);
});
test('limits and input paths validated before ingestion', async () => {
  await assert.rejects(buildEstatePilot({}), /both_input_paths_required/);
  await assert.rejects(buildEstatePilot({ propertyPath: 'x', caseLinksPath: 'y', maxCandidates: 1001 }), /invalid_candidate_limit/);
});
test('opt-in NEO Crawler adapter returns an offline evidence envelope without promotion', async () => {
  const f = await fixtures();
  const adapter = createEstateOfflineAdapter();
  const result = await adapter({
    hcadFile: f.property, approvedCaseLinksFile: f.cases,
    snapshotAt: '2026-11-15T12:00:00Z',
  });
  assert.equal(result.mode, 'offline_file_import_no_network_no_outreach');
  assert.equal(result.counts.matched_candidates, 2);
  assert.equal(result.production_import_permitted, false);
});
