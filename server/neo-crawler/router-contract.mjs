export const CRAWLER_ROUTE_TARGETS = Object.freeze({
  REASONING: 'neo-algo',
  SYNTHESIS: 'neo-oracle',
  ORCHESTRATION: 'neosync',
  SEARCH: 'noogle-neopedia',
  EDUCATION_REVIEW: 'giss-lms-review',
  LEGAL_RESEARCH: 'neo-law-research',
  EVIDENCE: 'neo-evidence-vault'
});

export function createCrawlerRouteEvent(envelope, targets = Object.values(CRAWLER_ROUTE_TARGETS)) {
  if (!envelope?.provenanceRequired) throw new Error('crawler_provenance_envelope_required');
  return {
    type: 'neo.crawler.ingested',
    schemaVersion: '1.1',
    createdAt: new Date().toISOString(),
    source: { service: envelope.service, version: envelope.version, adapter: envelope.adapter },
    governance: envelope.classification,
    targets: [...new Set(targets)],
    payload: envelope
  };
}
