import { createHash } from 'node:crypto';

const SHA256 = /^[a-fA-F0-9]{64}$/;
const CLASSES = new Set(['BTC_NATIVE','BITCOIN_COUNTERPARTY_ASSET','BITCOIN_COMMITTED_ASSET','CROSS_CHAIN_WRAPPED','SYNTHETIC','UNDETERMINED']);
const toHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const required = (value, name) => { if (typeof value !== 'string' || !value.trim()) throw new Error(name + ' required'); return value.trim(); };
const txid = value => { if (typeof value !== 'string' || !SHA256.test(value)) throw new Error('Bitcoin txid must be 64 hex characters'); return value.toLowerCase(); };
export function classifyAsset(record) {
  if (!record || typeof record !== 'object') throw new TypeError('asset record required');
  const classification = required(record.classification, 'classification');
  if (!CLASSES.has(classification)) throw new Error('unsupported classification');
  if (classification === 'BTC_NATIVE' && (record.network !== 'bitcoin-mainnet' || record.protocol !== 'bitcoin')) throw new Error('BTC_NATIVE must identify bitcoin-mainnet/bitcoin');
  if (classification === 'BITCOIN_COUNTERPARTY_ASSET' && (record.network !== 'bitcoin-mainnet' || record.protocol !== 'counterparty')) throw new Error('Counterparty classification must identify bitcoin-mainnet/counterparty');
  if (['BTC_NATIVE','BITCOIN_COUNTERPARTY_ASSET'].includes(classification)) txid(record.bitcoinTxid);
  return Object.freeze({ classification, network: required(record.network, 'network'), protocol: required(record.protocol, 'protocol'), bitcoinTxid: record.bitcoinTxid ? txid(record.bitcoinTxid) : null, evidenceStatus: 'UNVERIFIED' });
}
export function prepareIssuanceRecord(input) {
  const asset = classifyAsset(input);
  const assetId = required(input.assetId, 'assetId');
  const issuer = required(input.issuer, 'issuer');
  const evidence = Array.isArray(input.evidence) ? input.evidence.map(v => Object.freeze({ type: required(v.type,'evidence type'), reference: required(v.reference,'evidence reference') })) : [];
  const payload = { schema:'neo.bmi.issuance.v1', assetId, issuer, ...asset, evidence };
  return Object.freeze({ ...payload, evidenceHash: toHash(payload), verification: { bitcoin: 'NOT_CHECKED', counterparty: 'NOT_CHECKED', issuerControl: 'NOT_CHECKED' } });
}
export function prepareSecuredClaim(input) {
  const claimId = required(input.claimId, 'claimId');
  const assetId = required(input.assetId, 'assetId');
  const obligor = required(input.obligor, 'obligor');
  const securedParty = required(input.securedParty, 'securedParty');
  const agreementRef = required(input.agreementRef, 'agreementRef');
  const jurisdiction = required(input.jurisdiction, 'jurisdiction');
  const collateralEvidenceRef = required(input.collateralEvidenceRef, 'collateralEvidenceRef');
  const payload = { schema:'neo.bmi.credit.v1', claimId, assetId, obligor, securedParty, agreementRef, jurisdiction, collateralEvidenceRef };
  return Object.freeze({ ...payload, evidenceHash: toHash(payload), legalStatus:'NOT_VERIFIED', collateralStatus:'NOT_VERIFIED', priorityStatus:'NOT_DETERMINED', transferable:false });
}
// Provider adapters must independently check Bitcoin nodes, Counterparty messages, and signatures.
// API assertions alone never upgrade records to VERIFIED.
export async function verifyIssuance(record, { bitcoin, counterparty }) {
  if (!record?.bitcoinTxid) return { status:'NOT_VERIFIED', reason:'no Bitcoin transaction anchor' };
  if (!bitcoin || typeof bitcoin.getTransaction !== 'function') throw new Error('bitcoin verifier required');
  const proof = await bitcoin.getTransaction(record.bitcoinTxid);
  if (!proof || proof.txid?.toLowerCase() !== record.bitcoinTxid || proof.network !== 'bitcoin-mainnet' || !proof.confirmed) return { status:'NOT_VERIFIED', reason:'Bitcoin transaction proof unavailable or unconfirmed' };
  if (record.classification === 'BITCOIN_COUNTERPARTY_ASSET') {
    if (!counterparty || typeof counterparty.getIssuance !== 'function') throw new Error('Counterparty verifier required');
    const issuance = await counterparty.getIssuance(record.assetId);
    if (!issuance || issuance.asset !== record.assetId || issuance.tx_hash?.toLowerCase() !== record.bitcoinTxid) return { status:'NOT_VERIFIED', reason:'Counterparty issuance mismatch' };
  }
  return { status:'CHAIN_EVIDENCE_MATCHED', reason:'Chain linkage matched; issuer control, legal rights and reserve backing not verified' };
}
