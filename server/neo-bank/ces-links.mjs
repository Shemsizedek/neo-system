// NEO Bank -> external CES identifier mapping. No balance, custody or write authority.
// Never accept a CES account identifier alone as proof of ownership or authorization.
import { resolveCesIdentity } from '../neo-bots/bank-bot.mjs';

const clean = value => String(value ?? '').trim();
const idFormat = /^[A-Z0-9][A-Z0-9._-]{2,79}$/;
const subjectFormat = /^[a-zA-Z0-9:._-]{6,160}$/;

export function prepareCesAccountLink({ neoSubject, exchangeId, externalAccount } = {}) {
  const subject = clean(neoSubject);
  const exchange = clean(exchangeId).toUpperCase();
  const account = clean(externalAccount).toUpperCase();
  if (!subjectFormat.test(subject)) throw new Error('invalid_neo_subject');
  resolveCesIdentity(exchange); // Unknown exchanges must not silently link.
  if (!idFormat.test(account)) throw new Error('invalid_external_account');
  return Object.freeze({
    neoSubject: subject,
    exchangeId: exchange,
    externalAccount: account,
    status: 'pending_external_verification',
    permissions: Object.freeze({ read: false, transfer: false, issuance: false }),
  });
}

// The verifier must be an authorized server-side CES session/attestation checker.
// Importantly, there is no "verified: true" user-controlled shortcut.
export async function attestCesAccountLink(pending, evidence, { verifyCesOwnership } = {}) {
  if (pending?.status !== 'pending_external_verification' || typeof verifyCesOwnership !== 'function') {
    throw new Error('trusted_ces_verification_required');
  }
  if (!evidence || typeof evidence !== 'object') throw new Error('ces_evidence_required');
  const proof = await verifyCesOwnership({
    neoSubject: pending.neoSubject,
    exchangeId: pending.exchangeId,
    externalAccount: pending.externalAccount,
    evidence
  });
  if (proof?.verified !== true ||
    clean(proof.neoSubject) !== pending.neoSubject ||
    clean(proof.exchangeId).toUpperCase() !== pending.exchangeId ||
    clean(proof.externalAccount).toUpperCase() !== pending.externalAccount ||
    !Number.isFinite(Date.parse(proof.verifiedAt))) {
    throw new Error('ces_account_verification_failed');
  }
  return Object.freeze({
    neoSubject: pending.neoSubject,
    exchangeId: pending.exchangeId,
    externalAccount: pending.externalAccount,
    status: 'verified_identifier_only',
    verifiedAt: new Date(proof.verifiedAt).toISOString(),
    verificationSource: 'authorized_ces_server',
    // Account association is informational and NEVER grants authority to spend.
    permissions: Object.freeze({ read: false, transfer: false, issuance: false })
  });
}
