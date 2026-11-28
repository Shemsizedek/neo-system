/**
 * NEO-ESTATE-CRAWLER-003: private, offline adapter for authorized Harris County GIS parcel snapshots.
 * This module does NOT fetch, scrape, contact owners or certify that a county export is genuine.
 * It cannot classify property as probate, heirless, available for sale or a revenue opportunity.
 */
import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';

export const HCAD_GIS_LAYER = 'https://www.gis.hctx.net/arcgishcpid/rest/services/HCAD/Parcels/FeatureServer/0';
export const REQUIRED_ATTRIBUTES = Object.freeze(['acct_num', 'tax_year', 'state_class', 'total_market_val']);
const MAX_INPUT_BYTES = 4 * 1024 * 1024;

export function validateOfficialLayerUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('invalid_source_url'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hostname !== 'www.gis.hctx.net' ||
      ![new URL(HCAD_GIS_LAYER).pathname, new URL(HCAD_GIS_LAYER).pathname + '/query'].includes(url.pathname) ||
      url.port) throw new Error('source_not_allowlisted');
  return url.origin + url.pathname;
}

function parcelId(value) {
  const v = String(value ?? '').trim().replaceAll('-', '');
  return /^[0-9]{6,25}$/.test(v) ? v : null;
}
function marketValue(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
function safeCode(v) { return /^[A-Z0-9]{1,16}$/.test(String(v ?? '').trim().toUpperCase())
  ? String(v).trim().toUpperCase() : null; }

export function classifyOfficialGISFeatures(document, { expectedYear='2026', maxRecords=20 }={}) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('invalid_arcgis_document');
  if (document.error) throw new Error('arcgis_error_response');
  if (!Array.isArray(document.features)) throw new Error('arcgis_features_missing');
  if (!/^20\d{2}$/.test(String(expectedYear))) throw new Error('invalid_expected_year');
  if (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 100) throw new Error('invalid_max_records');
  const rows = [], seen = new Set();
  const counts = { features_received: document.features.length, accepted:0, duplicate:0,
    wrong_tax_year:0, invalid_account:0, confidential_skipped:0, invalid_fields:0, limited:0 };
  for (const item of document.features) {
    const a = item?.attributes;
    if (!a || typeof a !== 'object' || Array.isArray(a)) { counts.invalid_fields++; continue; }
    if (String(a.confidential_flag || '').trim().toUpperCase() === 'Y') { counts.confidential_skipped++; continue; }
    const id = parcelId(a.acct_num);
    if (!id) { counts.invalid_account++; continue; }
    if (String(a.tax_year) !== String(expectedYear)) { counts.wrong_tax_year++; continue; }
    if (seen.has(id)) { counts.duplicate++; continue; }
    if (rows.length >= maxRecords) { counts.limited++; continue; }
    seen.add(id);
    rows.push({
      parcel_id:id,
      tax_year:String(expectedYear),
      property_class_code:safeCode(a.state_class),
      gis_market_value_usd:marketValue(a.total_market_val),
      value_kind:'gis_assessment_not_listing_or_offer',
      official_record_authenticated:false,
      probate_case_verified:false, heirs_status:'unknown',
      sale_authority_verified:false, listing_verified:false,
      outreach_approved:false, acquisition_approved:false, production_import_permitted:false,
      record_class:'property_reference_only_not_estate_lead',
    });
  }
  counts.accepted = rows.length;
  return { counts, rows };
}

export async function preparePrivateGISSnapshot({path, sourceUrl, expectedYear='2026', maxRecords=20,
  observedAt = new Date().toISOString()}={}) {
  if (!path) throw new Error('input_file_required');
  const officialLayer = validateOfficialLayerUrl(sourceUrl);
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error('invalid_observed_at');
  if ((await stat(path)).size > MAX_INPUT_BYTES) throw new Error('snapshot_too_large');
  const bytes = await readFile(path);
  let document;
  try { document = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('invalid_json_snapshot'); }
  const {counts, rows} = classifyOfficialGISFeatures(document, {expectedYear,maxRecords});
  return {
    gate:'NEO-ESTATE-CRAWLER-003',
    mode:'offline_public_gis_snapshot_private_review_only',
    observed_at:observedAt,
    source_layer:officialLayer,
    supplied_snapshot_sha256:createHash('sha256').update(bytes).digest('hex'),
    supplied_source_identity_unverified:true,
    source_authenticity_verified:false,
    hcad_2026_cama_archive_imported:false,
    official_probate_case_data_imported:false,
    verified_estate_opportunities:0,
    leads_contacted:0,contracts_signed:0,revenue_received_usd:0,
    production_import_permitted:false,
    review_required:['confirm_original_response_origin','confirm_record_date_and_revision',
      'match_separately_licensed_probate_records','check_sale_authority','human_approval_for_outreach'],
    counts,parcel_references:rows,
  };
}

export async function runPrivateGISSnapshotCli(args=[]) {
  const opts = {};
  for (let i=0;i<args.length;i+=2) {
    if (!['--input','--source','--out','--year','--max'].includes(args[i]) ||
        opts[args[i]] || !args[i+1]) throw new Error('invalid_cli_arguments');
    opts[args[i]]=args[i+1];
  }
  if (!opts['--input'] || !opts['--source'] || !opts['--out']) throw new Error('input_source_output_required');
  const result=await preparePrivateGISSnapshot({path:opts['--input'],sourceUrl:opts['--source'],
    expectedYear:opts['--year']||'2026',maxRecords:opts['--max']?Number(opts['--max']):20});
  await writeFile(opts['--out'],JSON.stringify(result,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
  return {gate:result.gate,mode:result.mode,accepted:result.counts.accepted,
    source_authenticity_verified:false,production_import_permitted:false};
}
