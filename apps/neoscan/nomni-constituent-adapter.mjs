// NOMNI-SEO-013: read-only constituent evidence adapter (candidate; no chain/network I/O).
// Upstream blockchain and off-chain evidence MUST be supplied by independently verified adapters.
export const SCHEMA_VERSION = "nomni.constituent.v0.1";
export function normalizeNomniConstituent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("constituent_object_required");
  const required = ["constituent_id", "asset_class", "valuation_currency", "valuation_timestamp", "pricing_source", "supporting_evidence_uri"];
  for (const k of required) if (typeof input[k] !== "string" || !input[k].trim()) throw new TypeError(k + "_required");
  const at = Date.parse(input.valuation_timestamp);
  if (!Number.isFinite(at) || !/[zZ]|[+-]\d\d:\d\d$/.test(input.valuation_timestamp)) throw new TypeError("valuation_timestamp_must_include_timezone");
  const amount = input.valuation_amount;
  if (amount !== null && amount !== undefined && (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)) throw new TypeError("invalid_valuation_amount");
  const uri = new URL(input.supporting_evidence_uri);
  if (!["https:", "http:"].includes(uri.protocol)) throw new TypeError("invalid_evidence_url");
  const chain = input.chain === undefined ? null : input.chain;
  if (chain !== null && chain !== "Bitcoin/Counterparty") throw new TypeError("unsupported_chain");
  if (chain && (!input.asset_id || !input.issuance_txid)) throw new TypeError("onchain_identifiers_required");
  if (input.issuance_txid && !/^[a-f0-9]{64}$/i.test(input.issuance_txid)) throw new TypeError("invalid_bitcoin_txid");
  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    constituent_id: input.constituent_id.trim(),
    asset_class: input.asset_class.trim(),
    chain, asset_id: input.asset_id ?? null, issuance_txid: input.issuance_txid ?? null,
    valuation_amount: amount ?? null,
    valuation_currency: input.valuation_currency.trim(),
    valuation_timestamp: new Date(at).toISOString(),
    pricing_source: input.pricing_source.trim(),
    supporting_evidence_uri: uri.toString(),
    evidence_hash: input.evidence_hash ?? null,
    rights_reference: input.rights_reference ?? null,
    verification_status: "unverified",
    index_weight: null,
    index_level: null,
    reserve_backing_verified: false
  });
}
export function publicConstituentPayload(records) {
  if (!Array.isArray(records)) throw new TypeError("constituents_array_required");
  return Object.freeze({schema_version: SCHEMA_VERSION, methodology_status: "proposed", index_status: "not_calculated", constituents: records.map(normalizeNomniConstituent)});
}
