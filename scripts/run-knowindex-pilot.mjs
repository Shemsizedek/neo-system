import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { crawlKnowindex } from '../apps/noogle/index/knowindex-pilot.mjs';

const reportFile = 'data/knowindex/pilot-report.json';
const documentsFile = 'data/knowindex/pilot-documents.json';
const sourceId = 'world-library-knowindex';
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  generatedAt,
  status: 'BLOCKED',
  sourceId,
  sourceUrl: null,
  sourceRegistrySha256: null,
  robots: null,
  scope: null,
  attemptedPages: 0,
  crawled: 0,
  errors: [],
  records: [],
  publicationAuthorized: false,
  note: 'Read-only crawl evidence; no production index or Noogle publication was modified.'
};

try {
  if (process.env.KNOWINDEX_PILOT_APPROVED !== 'true') throw new Error('pilot_not_approved');
  const registryBytes = await fs.readFile('apps/noogle/index/sources.json');
  report.sourceRegistrySha256 = crypto.createHash('sha256').update(registryBytes).digest('hex');
  const registry = JSON.parse(registryBytes.toString('utf8'));
  const source = registry.sources.find(item => item.id === sourceId);
  if (!source) throw new Error('source_not_registered');
  report.sourceUrl = source.url;
  report.scope = {
    maxDepth: Math.min(1, Number(source.crawl?.maxDepth) || 0),
    maxPages: Math.min(10, Number(source.crawl?.maxPages) || 10),
    delayMs: Math.max(1500, Number(source.crawl?.delayMs) || 1500)
  };
  const result = await crawlKnowindex(source);
  report.robots = result.robots;
  report.attemptedPages = result.attemptedPages;
  report.crawled = result.crawled;
  report.errors = result.errors;
  report.records = result.records.map(({ id, url, canonicalUrl, title, contentHash, contentBytes, contentType, httpStatus, retrievedAt, publisher, evidenceState }) => ({
    id, url, canonicalUrl, title, contentHash, contentBytes, contentType, httpStatus, retrievedAt, publisher, evidenceState
  }));
  if (result.crawled > 0 && result.errors.length === 0) {
    report.status = 'READY_FOR_REVIEW';
    await fs.mkdir('data/knowindex', { recursive: true });
    await fs.writeFile(documentsFile, JSON.stringify({
      schemaVersion: 1, generatedAt, sourceId, documents: result.records
    }, null, 2) + '\n');
  }
} catch (error) {
  report.errors.push({ url: report.sourceUrl, error: String(error?.message || error) });
}

await fs.mkdir('data/knowindex', { recursive: true });
await fs.writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, crawled: report.crawled, attemptedPages: report.attemptedPages, reportFile, documentsFile: report.status === 'READY_FOR_REVIEW' ? documentsFile : null }));
if (report.status !== 'READY_FOR_REVIEW') process.exitCode = 1;
