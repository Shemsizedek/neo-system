/**
 * NEO Estate Crawler 001: authorized local-file ingestion only.
 * Neither this module nor its CLI has any network/outreach or database connector.
 * The public HCAD property dataset does not establish a probate or sale opportunity.
 */
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';

export const ESTATE_SOURCE_GATE = 'NEO-ESTATE-CRAWLER-001';

export function parseDelimitedLine(line, delimiter = ',') {
  if (!['\t', ','].includes(delimiter)) throw new Error('unsupported_delimiter');
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted) quoted = false;
      else if (cell.length === 0) quoted = true;
      else throw new Error('malformed_quote');
    } else if (ch === delimiter && !quoted) {
      cells.push(cell.trim()); cell = '';
    } else { cell += ch; }
  }
  if (quoted) throw new Error('unterminated_quoted_cell');
  cells.push(cell.trim());
  return cells;
}

export async function* readRows(path, delimiter = '\t') {
  const input = createReadStream(path, { encoding: 'utf8' });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let headers = null;
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber++;
    if (!line.trim()) continue;
    const parts = parseDelimitedLine(headers ? line : line.replace(/^\uFEFF/, ''), delimiter);
    if (!headers) {
      headers = parts.map(h => h.toLowerCase().trim());
      if (new Set(headers).size !== headers.length) throw new Error('duplicate_headers');
      continue;
    }
    if (parts.length !== headers.length) throw new Error('malformed_row_at_' + lineNumber);
    yield Object.fromEntries(headers.map((h, i) => [h, parts[i]]));
  }
  if (!headers) throw new Error('missing_header');
}

const field = (row, keys) => keys.map(k => row[k]).find(v => typeof v === 'string' && v.trim())?.trim() || null;
const numeric = value => {
  if (value == null || !/^[\d,]+(?:\.\d+)?$/.test(value)) return null;
  const n = Number(value.replaceAll(',', ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const normalizedId = value => String(value || '').trim().replace(/\s/g, '').toUpperCase();
const validUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.toString() : null; } catch { return null; } };
const allowedDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export function normalizeHcadProperty(row) {
  const parcel = normalizedId(field(row, ['acct', 'account', 'account_number', 'account_num', 'parcel_id']));
  if (!parcel) return null;
  return {
    parcel_id: parcel,
    county: 'Harris', state: 'TX',
    property_address: field(row, ['site_addr_1', 'site_address', 'situs_address', 'property_address']),
    property_class_code: field(row, ['state_class', 'state_class_code', 'property_class']),
    appraisal_value_usd: numeric(field(row, ['tot_appr_val', 'total_appraised_value', 'appraised_value'])),
    appraisal_is_asking_price: false,
  };
}

export function normalizeApprovedCaseLink(row) {
  const parcel = normalizedId(field(row, ['parcel_account', 'acct', 'parcel_id']));
  const caseNumber = field(row, ['case_number', 'cause_number']);
  if (!parcel || !caseNumber) return null;
  const url = validUrl(field(row, ['court_record_url', 'case_url', 'source_url']));
  const date = field(row, ['filed_date', 'filing_date']);
  return {
    parcel_id: parcel, case_number: caseNumber,
    court_record_url: url,
    filing_date: allowedDate(date) ? date : null,
    match_provenance: 'user_supplied_link_pending_independent_case_to_parcel_validation',
  };
}

export function makeCandidate(property, caseLink, snapshotAt) {
  const supporting = !!(caseLink.court_record_url && caseLink.filing_date);
  return {
    candidate_id: createHash('sha256').update(property.parcel_id + '\u0000' + caseLink.case_number).digest('hex').slice(0, 24),
    candidate_kind: 'probate_case_link_to_review',
    parcel_id: property.parcel_id,
    county: property.county, state: property.state,
    property_address: property.property_address,
    property_class_code: property.property_class_code,
    appraisal_value_usd: property.appraisal_value_usd,
    price_basis: 'appraisal_only_not_an_offer',
    case_number: caseLink.case_number,
    court_record_url: caseLink.court_record_url,
    filing_date: caseLink.filing_date,
    match_provenance: caseLink.match_provenance,
    evidence_score: supporting ? 45 : 20,
    evidence_score_meaning: 'source_completeness_only_not_profit_or_sale_likelihood',
    source_snapshot_at: snapshotAt,
    estate_filing_verified: false,
    case_to_parcel_match_verified: false,
    known_heirs_status: 'unknown',
    authorized_seller_verified: false,
    listed_for_sale_verified: false,
    outreach_approved: false,
    acquisition_approved: false,
    status: 'research_only',
  };
}

export async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function buildEstatePilot({ propertyPath, caseLinksPath, snapshotAt, maxCandidates = 100 } = {}) {
  if (!propertyPath || !caseLinksPath) throw new Error('both_input_paths_required');
  const capturedAt = snapshotAt || new Date().toISOString();
  if (!Number.isFinite(Date.parse(capturedAt))) throw new Error('invalid_snapshot_timestamp');
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 1000) throw new Error('invalid_candidate_limit');
  const links = new Map();
  let inputCaseLinks = 0;
  for await (const row of readRows(caseLinksPath, ',')) {
    inputCaseLinks++;
    const link = normalizeApprovedCaseLink(row);
    if (!link) continue;
    const list = links.get(link.parcel_id) || [];
    if (!list.some(x => x.case_number === link.case_number)) list.push(link);
    links.set(link.parcel_id, list);
  }
  let inputProperties = 0;
  let matchedProperties = 0;
  const candidateById = new Map();
  for await (const row of readRows(propertyPath, '\t')) {
    inputProperties++;
    const property = normalizeHcadProperty(row);
    if (!property || !links.has(property.parcel_id)) continue;
    matchedProperties++;
    for (const caseLink of links.get(property.parcel_id)) {
      const candidate = makeCandidate(property, caseLink, capturedAt);
      if (!candidateById.has(candidate.candidate_id)) candidateById.set(candidate.candidate_id, candidate);
    }
  }
  const candidates = [...candidateById.values()]
    .sort((a, b) => b.evidence_score - a.evidence_score || a.candidate_id.localeCompare(b.candidate_id))
    .slice(0, maxCandidates);
  return {
    gate: ESTATE_SOURCE_GATE,
    mode: 'offline_file_import_no_network_no_outreach',
    snapshot_at: capturedAt,
    input_sources: {
      hcad_property_data: { sha256: await sha256File(propertyPath), source: 'https://hcad.org/hcad-online-services/pdata/' },
      manually_approved_case_links: { sha256: await sha256File(caseLinksPath), source: 'user_supplied; license_and_case_provenance_require_review' },
    },
    counts: { input_properties: inputProperties, input_case_links: inputCaseLinks, matched_properties: matchedProperties, matched_candidates: candidateById.size, returned_candidates: candidates.length },
    review_flags: [ 'case_to_parcel_match_unverified', 'no_ownership_or_heirship_determination', 'appraisal_is_not_listing_or_offer', 'no_sale_authority_checked', 'no_live_probate_bulk_access' ],
    production_import_permitted: false,
    leads_contacted: 0, contracts_signed: 0, funds_transferred: 0,
    candidates,
  };
}

/** Optional registration into an existing NEO Crawler instance; no default auto-registration. */
export function createEstateOfflineAdapter() {
  return async descriptor => buildEstatePilot({
    propertyPath: descriptor?.hcadFile,
    caseLinksPath: descriptor?.approvedCaseLinksFile,
    snapshotAt: descriptor?.snapshotAt,
    maxCandidates: descriptor?.maxCandidates ?? 100,
  });
}
