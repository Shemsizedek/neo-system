import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DOCUMENTS = Object.freeze([
  { id: 'neo-algo', path: 'src/noology/neoAlgo.ts', role: 'noological_claim_analysis' },
  { id: 'nous-economic-value-kernel', path: 'src/noology/nousEconomicValueKernel.ts', role: 'value_model_and_reconciliation' },
  { id: 'nia-agents', path: 'registry/agents.yaml', role: 'canonical_agent_registry' },
]);

/**
 * Proof of source availability, NOT a claim that TypeScript business logic was
 * executed by this lightweight Node runtime.
 */
export function createSourceInventory({ reader = readFileSync, baseUrl = new URL('../../', import.meta.url) } = {}) {
  return {
    list() {
      return DOCUMENTS.map(doc => {
        let source;
        try {
          source = reader(new URL(doc.path, baseUrl));
          if (!Buffer.isBuffer(source)) source = Buffer.from(source);
        } catch {
          return { ...doc, status: 'unavailable', execution: 'disabled' };
        }
        return {
          ...doc,
          status: 'source_verified',
          sha256: createHash('sha256').update(source).digest('hex'),
          bytes: source.length,
          execution: 'disabled',
        };
      });
    },
  };
}
