/**
 * NEO-ESTATE-CRAWLER-004: opt-in, bounded read-only Harris County GIS query.
 * No cron registration, interactive portal scraping, third-party relays, owner-contact or DB writes.
 * Explicit call is required; only fetches public parcel attributes, never owners or mailing addresses.
 */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { HCAD_GIS_LAYER, classifyOfficialGISFeatures } from './estate-arcgis-snapshot.mjs';

const LIMIT_BYTES = 512 * 1024;
const MAX_COUNT = 20;
const FIELDS = 'OBJECTID,acct_num,tax_year,state_class,total_market_val,confidential_flag';

export function buildOfficialGISReadOnlyQuery({year='2026',count=10}={}) {
  if (!/^20\d{2}$/.test(String(year))) throw new Error('invalid_tax_year');
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) throw new Error('invalid_sample_count');
  const url = new URL(HCAD_GIS_LAYER + '/query');
  url.search = new URLSearchParams({
    f: 'json', where: "tax_year='" + year + "'", outFields: FIELDS,
    orderByFields: 'OBJECTID ASC', resultRecordCount: String(count),
    returnGeometry: 'false',
  }).toString();
  return url.toString();
}

async function consumeBoundedBody(response) {
  const reported = Number(response.headers?.get('content-length'));
  if (Number.isFinite(reported) && reported > LIMIT_BYTES) throw new Error('source_payload_too_large');
  if (!response.body?.getReader) throw new Error('source_body_missing');
  const reader = response.body.getReader();
  const chunks = []; let total = 0;
  try {
    for (;;) {
      const {value,done} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > LIMIT_BYTES) throw new Error('source_payload_too_large');
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}

/** fetchImpl injection is exclusively for testing; it is never promoted to a verified transport. */
export async function probeOfficialGIS({year='2026',count=10,fetchImpl=globalThis.fetch,
  observedAt=()=>new Date().toISOString(),timeoutMs=8000}={}) {
  const url = buildOfficialGISReadOnlyQuery({year,count});
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) throw new Error('invalid_timeout');
  if (typeof fetchImpl !== 'function') throw new Error('fetch_unavailable');
  const realNetwork = fetchImpl === globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(url,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',
      headers:{accept:'application/json'},signal:controller.signal});
    if (!response?.ok || response.status !== 200) throw new Error('source_http_not_ok');
    if (response.url && response.url !== url) throw new Error('source_redirect_or_origin_mismatch');
    const type = response.headers?.get('content-type') || '';
    if (!/^(application\/json|text\/plain)(;|$)/i.test(type)) throw new Error('source_not_json');
    const raw = await consumeBoundedBody(response);
    let document;
    try { document = JSON.parse(raw.toString('utf8')); } catch { throw new Error('invalid_arcgis_json'); }
    const parsed = classifyOfficialGISFeatures(document,{expectedYear:year,maxRecords:count});
    if (!parsed.counts.features_received) throw new Error('no_parcel_rows_in_response');
    const at = observedAt();
    if (Number.isNaN(Date.parse(at))) throw new Error('invalid_observed_at');
    return {
      gate:'NEO-ESTATE-CRAWLER-004',mode:'opt_in_public_harris_gis_read_only_bounded',
      observed_at:at,requested_query_url:url,transport_kind:realNetwork?'direct_https_fetch':'injected_test_transport',
      direct_https_response_observed:realNetwork,
      raw_response_sha256:createHash('sha256').update(raw).digest('hex'),
      raw_response_bytes:raw.byteLength,http_status:response.status,
      owner_or_contact_fields_requested:false,owner_details_exported:false,
      source_record_truth_independently_verified:false,
      county_probate_data_acquired:false,verified_estate_leads:0,
      seller_authority_verified:false,heirlessness_verified:false,
      outreach_approved:false,production_import_permitted:false,
      counts:parsed.counts,
      parcel_references:parsed.rows,
    };
  } finally {
    clearTimeout(timer);
    try { await response?.body?.cancel?.(); } catch { /* already read; no log */ }
  }
}

export async function runOfficialGISCli(args, {fetchImpl=globalThis.fetch}={}) {
  if (!args.includes('--public-readonly')) throw new Error('explicit_public_readonly_flag_required');
  const opts={};
  for (let i=0;i<args.length;i++) {
    if (args[i]==='--public-readonly') continue;
    if (!['--out','--year','--max'].includes(args[i]) || opts[args[i]] || !args[i+1]) throw new Error('invalid_arguments');
    opts[args[i]]=args[++i];
  }
  if (!opts['--out']) throw new Error('private_output_path_required');
  const result=await probeOfficialGIS({year:opts['--year']||'2026',
    count:opts['--max']?Number(opts['--max']):10,fetchImpl});
  if (result.counts.accepted < 1) throw new Error('zero_acceptable_property_rows');
  // Create only, private file; never overwrite an existing evidence receipt.
  await writeFile(opts['--out'],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  return {gate:result.gate,status:'private_source_receipt_created',
    accepted:result.counts.accepted,direct_https_response_observed:result.direct_https_response_observed,
    source_record_truth_independently_verified:false,verified_estate_leads:0};
}
