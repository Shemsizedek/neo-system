import fs from 'node:fs/promises';
import { crawlKnowindex } from '../apps/noogle/index/knowindex-pilot.mjs';
import { NoogleIndexStore } from '../apps/noogle/index/store.mjs';

if (process.env.KNOWINDEX_PILOT_APPROVED !== 'true') {
  console.error('KNOWINDEX pilot requires KNOWINDEX_PILOT_APPROVED=true');
  process.exitCode = 2;
} else {
  const registry = JSON.parse(await fs.readFile('apps/noogle/index/sources.json', 'utf8'));
  const source = registry.sources.find(item => item.id === 'world-library-knowindex');
  if (!source) throw new Error('KNOWINDEX source not registered');
  const result = await crawlKnowindex(source);
  const report = { generatedAt: new Date().toISOString(), sourceId: result.sourceId, rootUrl: result.rootUrl, crawled: result.crawled, errors: result.errors, records: result.records.map(({ id, url, title, contentHash, retrievedAt, publisher }) => ({ id, url, title, contentHash, retrievedAt, publisher })) };
  await fs.mkdir('data/knowindex', { recursive: true });
  await fs.writeFile('data/knowindex/pilot-report.json', JSON.stringify(report, null, 2) + '\n');
  if (result.errors.length || result.crawled === 0) {
    console.error('KNOWINDEX pilot did not meet publication criteria; no index updated');
    process.exitCode = 1;
  } else {
    const store = new NoogleIndexStore('data/noogle-index.json');
    await store.load();
    for (const record of result.records) store.upsert(record);
    await store.save();
    await fs.mkdir('public/api/noogle', { recursive: true });
    await fs.writeFile('public/api/noogle/knowindex.json', JSON.stringify({ generatedAt: report.generatedAt, documents: result.records }, null, 2) + '\n');
    console.log(JSON.stringify({ status: 'INDEXED', count: result.crawled, report: 'data/knowindex/pilot-report.json' }));
  }
}
