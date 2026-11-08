/**
 * NEO-GENIUS-007: synthetic-data-only bond transparency validation proof.
 * No actual TEA data, no live services, no government status assertions.
 * This is NOT the TEA's official schema and must not be used as such.
 */
import { createHash } from 'node:crypto';

const SHA = value => createHash('sha256').update(value).digest('hex');
const ENTITY_PATTERN = /^[A-Za-z0-9-]{3,20}$/;
const VALID_TYPES = new Set(['general-obligation', 'revenue', 'maintenance-tax', 'capital-project']);
const RECORD_KEYS = new Set(['leaCode', 'fiscalYear', 'instrumentType', 'amountCents', 'source']);
const SOURCE_KEYS = new Set(['url', 'observedAt', 'evidenceClass']);

function publicUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && Boolean(u.hostname) && !u.username && !u.password;
  } catch { return false; }
}
function rejectUnexpected(value, permitted, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(\`\${path} must be an object\`);
  for (const key of Object.keys(value)) if (!permitted.has(key)) throw new TypeError(\`\${path} contains unsupported/sensitive field: \${key}\`);
}
function normalize(row, i) {
  rejectUnexpected(row, RECORD_KEYS, \`row[\${i}]\`);
  const { leaCode, fiscalYear, instrumentType, amountCents, source } = row;
  if(typeof leaCode !== 'string' || !ENTITY_PATTERN.test(leaCode)) throw new TypeError('Invalid synthetic LEA identifier');
  if(!Number.isInteger(fiscalYear) || fiscalYear < 2025 || fiscalYear > 2029) throw new TypeError('Fiscal year outside synthetic pilot coverage');
  if(!VALID_TYPES.has(instrumentType)) throw new TypeError('Unknown pilot category');
  if(typeof amountCents !== 'string' || !/^(0|[1-9][0-9]*)$/.test(amountCents)) throw new TypeError('Financial amount must be an integer-cent decimal string');
  const cents = BigInt(amountCents);
  if(cents > 10n ** 20n) throw new RangeError('Amount exceeds pilot bound');
  rejectUnexpected(source, SOURCE_KEYS, 'source');
  if(!publicUrl(source.url) || !Number.isFinite(Date.parse(source.observedAt || ''))) throw new TypeError('Provenance requires HTTPS URL and valid time');
  if(source.evidenceClass !== 'synthetic-fixture') throw new TypeError('Pilot permits synthetic evidence only');
  return Object.freeze({leaCode, fiscalYear, instrumentType, amountCents: cents.toString(), source: Object.freeze({...source})});
}

/** The only permitted output is a clearly labeled synthetic demonstration. */
export function validateSyntheticBondBatch(rows = []) {
  if(!Array.isArray(rows) || rows.length === 0 || rows.length > 1000) throw new TypeError('Expected 1-1000 pilot rows');
  const seen = new Set(); let total = 0n;
  const normalized = rows.map((row,i) => {
    const rec = normalize(row,i);
    const key = \`\${rec.leaCode}|\${rec.fiscalYear}|\${rec.instrumentType}\`;
    if(seen.has(key)) throw new Error(\`Duplicate synthetic key \${key}: no double counting\`);
    seen.add(key); total += BigInt(rec.amountCents);
    return {leaCode:rec.leaCode, fiscalYear:rec.fiscalYear, instrumentType:rec.instrumentType, amountCents:rec.amountCents, sourceUrl:rec.source.url, observedAt:rec.source.observedAt, evidenceDigest:SHA(JSON.stringify(rec))};
  });
  return Object.freeze({
    schema:'neo-genius-007/synthetic-bond-transparency-v1',
    status:'SYNTHETIC-DEMO-NOT-TEA-DATA',
    officialSchema:false, agencyAuthorization:false, complianceCertified:false,
    records:normalized,
    totalSyntheticAmountCents:total.toString(),
    provenanceHash:SHA(JSON.stringify(normalized)),
    disclaimer:'Synthetic test data only. Not official school bond records, verified issuer liabilities, an investment offering, agency acceptance, or a public bond position.'
  });
}

const evidenceKinds = Object.freeze({
  prime:['legalEntity','bonfireAccess','vendorRegistration','insuranceTechCyber','insuranceOther','txRampPlan','vetHubPlan','deliveryStaff','performanceReferences','financialCapacity','architecture','accessibleUX','agencyRequirements','pricingAndRisk','signoffAuthority'],
  subcontract:['legalEntity','primePartner','writtenScope','primeFlowdown','securityRequirements','insuranceFlowdown','deliveryCapability','legalReview']
});
function evidenceObject(x) {
  return Boolean(x && typeof x === 'object' && publicUrl(x.url) && typeof x.reviewedBy === 'string' && x.reviewedBy.length > 2 && typeof x.receivedAt === 'string' && Number.isFinite(Date.parse(x.receivedAt)));
}
/** A checklist can identify missing evidence, but does NOT grant regulatory or procurement approval. */
export function assessTeaResponseReadiness({route='prime',evidence={}}={}) {
  if(!Object.hasOwn(evidenceKinds,route)) throw new TypeError('route must be prime or subcontract');
  const missing = evidenceKinds[route].filter(key=>!evidenceObject(evidence[key]));
  return Object.freeze({
    solicitation:'TEA-701-26-015',route,
    status:missing.length ? 'MISSING-EVIDENCE' : 'ALL-DOCUMENT-REFERENCES-PRESENT-EXTERNAL-REVIEW-REQUIRED',
    missing,
    portalSubmissionAuthorized:false, insuranceVerified:false, txRampAuthorized:false,
    governmentAwarded:false, proposalEligible:false,
    sourceOfTruth:'official RFO + amendments + buyer portal; this is a nonbinding internal review only'
  });
}
