/**
 * NEO-ESTATE-CRAWLER-002: local HCAD real_acct.txt file preflight.
 * No network, seller outreach, record publication or DB writes.
 */
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseDelimitedLine, readRows, sha256File } from './estate-sourcing.mjs';

export const HCAD_REAL_ACCT_LAYOUT_SOURCE = 'https://hcad.org/assets/uploads/pdf/pdataCodebook.pdf';
export const HCAD_PUBLIC_DATA_SOURCE = 'https://hcad.org/pdata/pdata-property-downloads.html';
export const HCAD_REQUIRED_FIELDS = Object.freeze(['acct','yr','site_addr_1','state_class','tot_appr_val','tot_mkt_val']);

export function validateHcadHeader(header) {
  if (typeof header !== 'string') throw new TypeError('header_required');
  const normalized = parseDelimitedLine(header.replace(/^\uFEFF/, ''), '\t').map(x => x.trim().toLowerCase());
  if (normalized.some(x => !x)) throw new Error('empty_header_field');
  if (new Set(normalized).size !== normalized.length) throw new Error('duplicate_header_fields');
  const missing = HCAD_REQUIRED_FIELDS.filter(x => !normalized.includes(x));
  if (missing.length) throw new Error('hcad_required_fields_missing_' + missing.join('_'));
  return { columns: normalized.length, requiredFields: [...HCAD_REQUIRED_FIELDS],
    optionalColumnCount: normalized.length - HCAD_REQUIRED_FIELDS.length };
}

async function firstNonemptyLine(path) {
  const reader = createInterface({ input: createReadStream(path,{encoding:'utf8'}), crlfDelay:Infinity });
  try { for await (const line of reader) if (line.trim()) return line; }
  finally { reader.close(); }
  throw new Error('missing_header');
}

export async function inspectHcadLocalFile({path, expectedYear='2026', sampleLimit=50,
  observedAt=new Date().toISOString()}={}) {
  if (!path) throw new Error('hcad_file_required');
  if (!/^20\d\d$/.test(String(expectedYear))) throw new Error('invalid_expected_year');
  if (!Number.isInteger(sampleLimit) || sampleLimit < 1 || sampleLimit > 1000) throw new Error('invalid_sample_limit');
  if (Number.isNaN(Date.parse(observedAt))) throw new Error('invalid_observed_at');
  const layout = validateHcadHeader(await firstNonemptyLine(path));
  const counts = {rows_sampled:0,accounts_populated:0,appraisal_values_present:0,
    market_values_present:0,year_mismatches:0,address_populated:0};
  for await (const row of readRows(path,'\t')) {
    if (counts.rows_sampled >= sampleLimit) break;
    counts.rows_sampled++;
    if (row.acct?.trim()) counts.accounts_populated++;
    if (/^[0-9,.]+$/.test(row.tot_appr_val?.trim() || '')) counts.appraisal_values_present++;
    if (/^[0-9,.]+$/.test(row.tot_mkt_val?.trim() || '')) counts.market_values_present++;
    if (row.site_addr_1?.trim()) counts.address_populated++;
    if ((row.yr || '').trim() !== String(expectedYear)) counts.year_mismatches++;
  }
  if (!counts.rows_sampled) throw new Error('no_property_records');
  if (counts.year_mismatches) throw new Error('source_year_mismatch');
  if (counts.accounts_populated !== counts.rows_sampled) throw new Error('missing_accounts');
  return {
    gate:'NEO-ESTATE-CRAWLER-002',mode:'offline_hcad_layout_and_sample_preflight',
    observed_at:observedAt,claimed_dataset_year:String(expectedYear),
    declared_source_page:HCAD_PUBLIC_DATA_SOURCE,layout_source:HCAD_REAL_ACCT_LAYOUT_SOURCE,
    source_sha256:await sha256File(path),layout,sample:counts,
    source_authenticity_verified:false,
    official_2026_archive_downloaded_by_this_program:false,
    probate_feed_connected:false,probate_case_records_loaded:0,
    live_estate_opportunities_verified:0,owner_or_heirship_claims_derived:0,
    automation_and_contact_permitted:false,production_import_permitted:false,
    classification:'layout_passed_source_authenticity_and_probate_access_pending'
  };
}
