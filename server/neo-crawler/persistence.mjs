import { createHash } from 'node:crypto';

export function fingerprintCrawlerEnvelope(envelope) {
  const docs = extractDocuments(envelope?.result);
  return docs.map(doc => ({
    id: doc.id || null,
    canonicalUrl: doc.canonicalUrl || doc.url || null,
    contentHash: doc.contentHash || createHash('sha256').update(JSON.stringify(doc)).digest('hex'),
    retrievedAt: doc.retrievedAt || envelope.generatedAt || new Date().toISOString(),
    title: doc.title || doc.canonicalUrl || doc.url || 'Crawler record',
    sourceClass: doc.sourceClass || 'other',
    evidenceState: doc.evidenceState || 'unverified'
  }));
}

export function createEvidenceVaultSink(vault, { asset = 'NEO-CRAWLER', actor = 'neo-crawler' } = {}) {
  if (!vault?.createEvidence) throw new TypeError('Evidence Vault createEvidence contract required');
  return {
    persist(envelope) {
      return fingerprintCrawlerEnvelope(envelope).map(item => vault.createEvidence({
        asset,
        id: item.id ? `crawler:${item.id}:${item.contentHash.slice(0,12)}` : undefined,
        title: item.title,
        sourceType: 'CRAWLER_SNAPSHOT',
        sourceUrl: item.canonicalUrl || undefined,
        observedAt: item.retrievedAt,
        claimType: 'RESEARCH_INPUT',
        note: JSON.stringify({ contentHash: item.contentHash, sourceClass: item.sourceClass, evidenceState: item.evidenceState, adapter: envelope.adapter })
      }, actor));
    }
  };
}

function extractDocuments(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.docs)) return result.docs;
  return [result];
}
