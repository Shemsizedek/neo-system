// NEO–BAAS–002: synthetic-only BaaS contract primitives.
// No database writes, customer funds, external provider calls or account issuance.
const ID = /^[a-z][a-z0-9_-]{2,63}$/;
const CURRENCY = /^[A-Z]{3,12}$/;
export const BAAS_MODE = 'synthetic-only';

export function requireTenant(actor, tenantId, capability = 'ledger:read') {
  if (!actor || actor.authenticated !== true || typeof tenantId !== 'string' ||
      !ID.test(tenantId) || actor.tenantId !== tenantId ||
      !Array.isArray(actor.scopes) || !actor.scopes.includes(capability)) {
    throw new Error('tenant_authorization_required');
  }
  return true;
}

export function parseMinorUnits(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,15})$/.test(value)) {
    throw new Error('invalid_minor_units');
  }
  const amount = BigInt(value);
  if (amount <= 0n || amount > 9007199254740991n) throw new Error('invalid_minor_units');
  return amount;
}

export function planSyntheticJournal({actor, tenantId, debitAccount, creditAccount,
  amountMinor, currency, idempotencyKey}) {
  requireTenant(actor, tenantId, 'ledger:simulate');
  if (![debitAccount, creditAccount].every(v => typeof v === 'string' && ID.test(v)) ||
      debitAccount === creditAccount) throw new Error('invalid_accounts');
  if (typeof currency !== 'string' || !CURRENCY.test(currency)) throw new Error('invalid_currency');
  if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{12,100}$/.test(idempotencyKey))
    throw new Error('invalid_idempotency_key');
  const amount = parseMinorUnits(amountMinor);
  // Distinct signed journal directions; amounts are never converted to JS Number.
  const entries = Object.freeze([
    Object.freeze({accountId: debitAccount, direction: 'debit', amountMinor: amount.toString()}),
    Object.freeze({accountId: creditAccount, direction: 'credit', amountMinor: amount.toString()})
  ]);
  return Object.freeze({mode: BAAS_MODE, tenantId, currency, idempotencyKey, entries});
}

export function validateBalancedJournal(journal) {
  if (!journal || journal.mode !== BAAS_MODE || !Array.isArray(journal.entries) ||
      journal.entries.length < 2) throw new Error('invalid_synthetic_journal');
  let debit = 0n, credit = 0n;
  for (const line of journal.entries) {
    const amount = parseMinorUnits(line?.amountMinor);
    if (line.direction === 'debit') debit += amount;
    else if (line.direction === 'credit') credit += amount;
    else throw new Error('invalid_direction');
  }
  if (debit !== credit) throw new Error('unbalanced_journal');
  return true;
}

// A provider must be deliberately implemented, contracted and approved later.
export function disabledBankingProvider() {
  const deny = async () => { throw new Error('banking_provider_not_authorized'); };
  return Object.freeze({
    issueAccount: deny, initiateAch: deny, initiateWire: deny,
    issueCard: deny, moveFunds: deny, custodyAsset: deny
  });
}
