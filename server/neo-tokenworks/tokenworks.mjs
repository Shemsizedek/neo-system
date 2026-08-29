import crypto from 'node:crypto';

export const TOKENWORKS_MODES = Object.freeze({
  SHARED_ACCESS: 'SHARED_ACCESS',
  TIME_LOCKED_ESCROW: 'TIME_LOCKED_ESCROW'
});

const clean = value => String(value || '').trim();
const future = (value, now) => {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || ms <= now) throw new Error('expiresAt must be in the future');
  return new Date(ms).toISOString();
};

export function createTokenworks({ now = () => Date.now() } = {}) {
  const challenges = new Map();
  const leases = new Map();
  const escrowPlans = new Map();

  function issueAddressChallenge({ address, accountId }) {
    address = clean(address); accountId = clean(accountId);
    if (!address || !accountId) throw new Error('address and accountId are required');
    const record = { id: crypto.randomUUID(), address, accountId, nonce: crypto.randomBytes(32).toString('hex'), domain: 'neo.services', issuedAt: new Date(now()).toISOString(), expiresAt: new Date(now() + 5 * 60_000).toISOString(), usedAt: null };
    challenges.set(record.id, record);
    return record;
  }

  function grantSharedAccess(input) {
    const required = ['ownerAccountId','borrowerAccountId','ownerAddress','asset','entitlement'];
    for (const field of required) if (!clean(input[field])) throw new Error(`${field} is required`);
    if (input.ownerAccountId === input.borrowerAccountId) throw new Error('borrower must differ from owner');
    const record = {
      id: crypto.randomUUID(), mode: TOKENWORKS_MODES.SHARED_ACCESS,
      ownerAccountId: clean(input.ownerAccountId), borrowerAccountId: clean(input.borrowerAccountId),
      ownerAddress: clean(input.ownerAddress), asset: clean(input.asset).toUpperCase(),
      entitlement: clean(input.entitlement), startsAt: new Date(now()).toISOString(),
      expiresAt: future(input.expiresAt, now()), revokedAt: null, status: 'ACTIVE',
      ownerAccessDuringLease: input.ownerAccessDuringLease === true ? 'ALLOWED' : 'SUSPENDED',
      onChainOwnershipTransferred: false, proofStatus: 'PENDING_SIGNATURE_VERIFICATION'
    };
    leases.set(record.id, record);
    return record;
  }

  function revokeSharedAccess(id) {
    const record = leases.get(id);
    if (!record) return null;
    if (record.status !== 'ACTIVE') return record;
    record.status = 'REVOKED'; record.revokedAt = new Date(now()).toISOString();
    return record;
  }

  function composeEscrowPlan(input) {
    const required = ['ownerAddress','borrowerAddress','returnAddress','asset','quantity'];
    for (const field of required) if (!clean(input[field])) throw new Error(`${field} is required`);
    const expiryBlock = Number(input.expiryBlock);
    if (!Number.isSafeInteger(expiryBlock) || expiryBlock <= Number(input.currentBlock || 0)) throw new Error('expiryBlock must be a future integer block');
    const record = {
      id: crypto.randomUUID(), mode: TOKENWORKS_MODES.TIME_LOCKED_ESCROW,
      ownerAddress: clean(input.ownerAddress), borrowerAddress: clean(input.borrowerAddress),
      returnAddress: clean(input.returnAddress), asset: clean(input.asset).toUpperCase(),
      quantity: clean(input.quantity), expiryBlock, currentBlock: Number(input.currentBlock || 0),
      enforcement: input.enforcement === 'BITCOIN_SCRIPT' ? 'BITCOIN_SCRIPT' : 'AUTOMATION_WITH_MULTISIG',
      status: 'PLAN_ONLY', composeEnabled: false, signEnabled: false, broadcastEnabled: false,
      warnings: [
        'No private keys are accepted or stored.',
        'Counterparty balance semantics and Bitcoin spending conditions must be verified on regtest.',
        'Automation-based return is not equivalent to consensus-enforced return.'
      ]
    };
    escrowPlans.set(record.id, record);
    return record;
  }

  function capabilities() {
    return {
      service: 'neo-tokenworks', release: 'ORIGIN_SANDBOX',
      consumers: ['neo-banks','neopay','neo-teller','neo-hub','neo-wire'],
      sharedAccess: { issue: true, revoke: true, ownerSuspension: true, proofVerification: false },
      escrow: { plan: true, compose: false, sign: false, broadcast: false, mainnet: false },
      compliance: { kycProviderConnected: false, addressProofChallenge: true, sanctionsScreeningConnected: false }
    };
  }

  return { issueAddressChallenge, grantSharedAccess, revokeSharedAccess, composeEscrowPlan, capabilities, leases, escrowPlans };
}
