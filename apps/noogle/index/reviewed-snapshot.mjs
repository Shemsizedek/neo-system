import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { permittedUrl } from './knowindex-pilot.mjs';

const ROOT = 'https://holytemples.org/hy/world-library/';
const ID = 'world-library-knowindex';
const hexSha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function requireEvidence(condition, reason) {
  if (!condition) throw new Error('knowindex_publication_blocked:' + reason);
}

export async function applyReviewedKnowindex({ store, reports, registry, directory = 'data/knowindex' }) {
  let approvalBytes;
  try {
    approvalBytes = await fs.readFile(path.join(directory, 'reviewed-release.json'));
  } catch (error) {
    if (error.code === 'ENOENT') return { indexed: false, reason: 'no_reviewed_release' };
    throw error;
  }
  const approval = JSON.parse(approvalBytes.toString('utf8'));
  requireEvidence(approval.schemaVersion === 1 && approval.publicationApproved === true, 'approval_missing');
  requireEvidence(approval.sourceId === ID && approval.sourceUrl === ROOT, 'unapproved_source');
  requireEvidence(approval.documentCount > 0 && approval.documentCount <= 10, 'invalid_document_count');
  requireEvidence(/^[0-9a-f]{64}$/.test(approval.reportSha256 || '') && /^[0-9a-f]{64}$/.test(approval.documentsSha256 || ''), 'missing_digest');

  const source = registry.sources.find(item => item.id === ID);
  requireEvidence(source?.url === ROOT && source?.enabled === false, 'registry_scope_invalid');
  const [reportBytes, documentsBytes] = await Promise.all([
    fs.readFile(path.join(directory, 'pilot-report.json')),
    fs.readFile(path.join(directory, 'pilot-documents.json'))
  ]);
  requireEvidence(hexSha256(reportBytes) === approval.reportSha256, 'report_digest_mismatch');
  requireEvidence(hexSha256(documentsBytes) === approval.documentsSha256, 'documents_digest_mismatch');

  const report = JSON.parse(reportBytes.toString('utf8'));
  const payload = JSON.parse(documentsBytes.toString('utf8'));
  requireEvidence(report.schemaVersion === 1 && report.status === 'READY_FOR_REVIEW', 'crawl_not_verified');
  requireEvidence(report.publicationAuthorized === false, 'crawl_must_be_read_only');
  requireEvidence(report.sourceId === ID && report.sourceUrl === ROOT, 'report_source_mismatch');
  requireEvidence(report.robots?.url === 'https://holytemples.org/robots.txt' && report.robots.status === 200, 'robots_not_verified');
  requireEvidence(/^[0-9a-f]{64}$/.test(report.robots.sha256 || ''), 'robots_digest_missing');
  requireEvidence(Array.isArray(report.errors) && report.errors.length === 0, 'crawl_has_errors');
  requireEvidence(report.crawled === approval.documentCount && report.attemptedPages <= 10, 'crawl_count_mismatch');
  requireEvidence(payload.schemaVersion === 1 && payload.sourceId === ID && payload.generatedAt === report.generatedAt, 'payload_mismatch');
  requireEvidence(Array.isArray(payload.documents) && payload.documents.length === approval.documentCount, 'documents_count_mismatch');
  requireEvidence(Array.isArray(report.records) && report.records.length === payload.documents.length, 'report_count_mismatch');

  for (const doc of payload.documents) {
    requireEvidence(doc.url === doc.canonicalUrl && permittedUrl(doc.url, ROOT), 'document_scope_invalid');
    requireEvidence(doc.httpStatus === 200 && /^text\/html\b/i.test(doc.contentType || ''), 'document_http_invalid');
    requireEvidence(/^[0-9a-f]{64}$/.test(doc.contentHash || '') && doc.contentBytes > 0 && doc.contentBytes <= 2_000_000, 'document_hash_or_size_invalid');
    const evidence = report.records.find(item => item.id === doc.id);
    requireEvidence(evidence && evidence.url === doc.url && evidence.contentHash === doc.contentHash && evidence.retrievedAt === doc.retrievedAt, 'document_provenance_mismatch');
    requireEvidence(doc.evidenceState === 'reference' && doc.publisher === source.name, 'document_attribution_mismatch');
  }

  for (const doc of payload.documents) {
    store.upsert({
      ...doc,
      sourceClass: source.sourceClass || source.type || 'community-archive',
      communityTerms: [{ term: source.community, aliases: ['Hall of Knowledge'] }]
    });
  }
  reports.push({
    sourceId: ID,
    rootUrl: ROOT,
    crawled: payload.documents.length,
    sourceMode: 'reviewed-static-snapshot',
    evidenceRunUrl: approval.runUrl,
    reportSha256: approval.reportSha256,
    robotsUrl: report.robots.url,
    errors: []
  });
  return { indexed: true, count: payload.documents.length, evidenceRunUrl: approval.runUrl };
}
