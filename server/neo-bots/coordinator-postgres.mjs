/**
 * PostgreSQL persistence adapter for the NEO Bank coordinator API.
 * pool is a trusted server-side pg-compatible Pool, never exposed to browsers.
 */
export function createCesCoordinatorStore(pool) {
  if (!pool?.query) throw new Error('PostgreSQL pool required');
  return {
    async reserveCommand({ actor, commandId, exchangeId, action }) {
      if (!actor?.organizationId || !actor?.id) throw new Error('Verified tenant and actor required');
      const result = await pool.query(
        `INSERT INTO neo_ces_commands (organization_id, command_id, coordinator_id, exchange_id, action)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING command_id`,
        [actor.organizationId, commandId, actor.id, exchangeId, action]
      );
      return { created: result.rowCount === 1 };
    },
    async saveReceipt(receipt) {
      if (!receipt.organizationId || !receipt.commandId) throw new Error('Tenant and command required');
      const eligible = receipt.accountingEligible === true && receipt.disposition === 'verified-receipt';
      if (eligible && (!receipt.legacyReference || !receipt.evidenceReference)) throw new Error('Verified evidence required');
      await pool.query(
        `INSERT INTO neo_ces_receipts
         (organization_id, command_id, disposition, accounting_eligible, legacy_reference, evidence_reference)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (organization_id, command_id) DO UPDATE
         SET disposition=EXCLUDED.disposition, accounting_eligible=EXCLUDED.accounting_eligible,
             legacy_reference=EXCLUDED.legacy_reference, evidence_reference=EXCLUDED.evidence_reference`,
        [receipt.organizationId, receipt.commandId, receipt.disposition, eligible,
          receipt.legacyReference ?? null, receipt.evidenceReference ?? null]
      );
    }
  };
}
