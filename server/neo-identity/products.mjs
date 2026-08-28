import bindings from '../../config/identity/product-bindings.json' with { type: 'json' };

export const FOUNDER_SUBJECT = bindings.canonical_subject;

export function getProductFounderBinding(productId) {
  const binding = bindings.products[productId];
  if (!binding) throw new Error(`Unknown NEO product: ${productId}`);
  return Object.freeze({ productId, subjectId: FOUNDER_SUBJECT, ...binding });
}

export function bootstrapProductFounder(productId, records = []) {
  const binding = getProductFounderBinding(productId);
  const existing = records.find(r => r.productId === productId && r.accountOrdinal === 1);
  if (existing) {
    if (existing.subjectId !== FOUNDER_SUBJECT) {
      throw new Error(`${productId} account #1 is occupied by a different principal`);
    }
    return { records, founder: existing, created: false };
  }

  const founder = Object.freeze({
    productId,
    subjectId: FOUNDER_SUBJECT,
    accountOrdinal: 1,
    role: binding.role,
    reserved: true,
    verifiedEnrollmentRequired: true,
    authenticationBypass: false
  });
  return { records: [founder, ...records], founder, created: true };
}

export function assertProductFounderInvariant(productId, records = []) {
  const result = bootstrapProductFounder(productId, records);
  const founder = result.founder;
  if (founder.accountOrdinal !== 1) throw new Error('Founder must remain account #1');
  if (founder.authenticationBypass !== false) throw new Error('Founder may not bypass authentication');
  return true;
}
