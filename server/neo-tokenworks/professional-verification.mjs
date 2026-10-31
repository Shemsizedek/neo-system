import crypto from 'node:crypto';

const ROLE_SET = new Set(['holder','officer','underwriter','auditor','accountant','broker','lawyer','independent-reviewer']);
const REQUIREMENTS = Object.freeze({PERSONAL:1, BUSINESS:2});
const norm = v => String(v??'').trim();
const sha256 = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

/** Read-only multisig registry policies; does not create a Bitcoin descriptor or hold keys. */
export function validateWalletProfile(profile) {
  if (!profile || !Object.hasOwn(REQUIREMENTS,profile.kind)) throw new Error('WALLET_KIND_INVALID');
  if (!['bitcoin-mainnet-counterparty','bitcoin-regtest-counterparty'].includes(profile.network)) throw new Error('NETWORK_INVALID');
  if (!Number.isSafeInteger(profile.threshold) || !Array.isArray(profile.signers) ||
      profile.signers.length < REQUIREMENTS[profile.kind] ||
      profile.signers.length > 15 || profile.threshold < REQUIREMENTS[profile.kind] ||
      profile.threshold > profile.signers.length) throw new Error('THRESHOLD_INVALID');
  const ids = new Set();
  for (const signer of profile.signers) {
    if (!signer || !norm(signer.id) || !ROLE_SET.has(signer.role) || ids.has(signer.id)) throw new Error('SIGNER_INVALID');
    ids.add(signer.id);
    if (signer.role !== 'holder' && signer.role !== 'officer' && profile.kind === 'PERSONAL') throw new Error('PERSONAL_ROLE_INVALID');
  }
  if (profile.kind === 'BUSINESS' && !norm(profile.legalEntityId)) throw new Error('ENTITY_REQUIRED');
  return Object.freeze({status:'POLICY_VALID_ONLY',kind:profile.kind,network:profile.network,threshold:profile.threshold,signerCount:profile.signers.length,
    policyDigest:sha256(profile),addressDerived:false,descriptorVerified:false,signingEnabled:false,custodyEstablished:false});
}

/** Credential metadata is NEVER proof of professional licensing by itself. */
export function reviewProfessionalCredential(c,{now=Date.now(),verifier}={}) {
  if (!c || !norm(c.personId) || !norm(c.profession) || !norm(c.jurisdiction) || !norm(c.licenseNumber) ||
    !norm(c.issuer) || !norm(c.sourceUrl) || !norm(c.validUntil)) return {status:'HOLD',reason:'CREDENTIAL_FIELDS_MISSING'};
  const expiry=Date.parse(c.validUntil);
  if (!Number.isFinite(expiry) || expiry <= now) return {status:'HOLD',reason:'CREDENTIAL_EXPIRED'};
  // Independent authoritative registry verification must be performed by an approved adapter.
  if (typeof verifier !== 'function') return {status:'PENDING_EXTERNAL_REGISTRY_CHECK',credentialDigest:sha256(c),licensed:false};
  const res=verifier(c);
  if (!res || res.status!=='ACTIVE' || !norm(res.registryEvidenceId) || !norm(res.verifiedAt)) return {status:'HOLD',reason:'EXTERNAL_REGISTRY_UNVERIFIED'};
  const observed=Date.parse(res.verifiedAt);
  if (!Number.isFinite(observed) || observed>now || now-observed>86_400_000) return {status:'HOLD',reason:'REGISTRY_CHECK_STALE'};
  return {status:'REGISTRY_EVIDENCE_RECORDED',credentialDigest:sha256(c),registryEvidenceId:res.registryEvidenceId,verifiedAt:res.verifiedAt,
    // Human/legal verification still required, and no signing or custody privilege conveyed.
    licensed:'REQUIRES_HUMAN_REVIEW',signingEnabled:false};
}

/** Cross-check independently configured read-only Counterparty Core v2 adapters.
 * Providers are injected for testability; caller is responsible for HTTPS identity,
 * response signatures/TLS, distinct node ownership and correct source semantics.
 */
export async function collectCounterpartyEvidence({asset='NOMNI',address,sources,fetchSnapshot}={}) {
  if (asset!=='NOMNI' || !norm(address) || !Array.isArray(sources) || sources.length<2 ||
      new Set(sources.map(s=>s.operatorId)).size<2 ||
      sources.some(s=>!norm(s.operatorId)||!norm(s.apiBase)||!s.apiBase.startsWith('https://')) ||
      typeof fetchSnapshot!=='function') return {status:'HOLD',reason:'INDEPENDENT_SOURCES_REQUIRED'};
  const snapshots=await Promise.allSettled(sources.map(s=>fetchSnapshot({source:s,asset,address,
    endpoints:[`/v2/assets/${asset}`,`/v2/addresses/${encodeURIComponent(address)}/balances/${asset}`,`/v2/assets/${asset}/orders`,`/v2/assets/${asset}/dispensers`]})));
  if (snapshots.some(s=>s.status!=='fulfilled')) return {status:'HOLD',reason:'SOURCE_UNAVAILABLE'};
  const records=snapshots.map(s=>s.value);
  if (records.some(s=>!s || s.asset!==asset || s.address!==address || !Number.isSafeInteger(s.blockHeight) ||
      !/^[0-9a-f]{64}$/i.test(s.blockHash??'') || !Number.isFinite(s.quantity) || s.quantity<0))
      return {status:'HOLD',reason:'SNAPSHOT_INVALID'};
  const first=records[0];
  if (records.some(s=>s.blockHeight!==first.blockHeight || s.blockHash!==first.blockHash || s.quantity!==first.quantity))
      return {status:'HOLD',reason:'INDEPENDENT_SOURCE_DISAGREEMENT'};
  return {status:'CONSISTENT_REPORTED_SNAPSHOTS',asset,address,blockHeight:first.blockHeight,blockHash:first.blockHash,quantity:first.quantity,
    sources:sources.map(s=>s.operatorId),evidenceDigest:sha256(records),walletSignatureVerified:false,legalTitleVerified:false,
    independentAttestation:false,executableLiquidityVerified:false,signingEnabled:false};
}
