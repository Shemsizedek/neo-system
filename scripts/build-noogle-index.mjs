import fs from 'node:fs/promises';
import { NoogleIndexStore } from '../apps/noogle/index/store.mjs';
import { crawlPublicSource } from '../apps/noogle/index/crawler.mjs';

const seeds = [
  { url: 'https://counterparty.io/', sourceClass: 'reference', evidenceState: 'reference', publisher: 'Counterparty' },
  { url: 'https://mempool.space/', sourceClass: 'reference', evidenceState: 'reference', publisher: 'mempool.space' },
  { url: 'https://www.openalex.org/', sourceClass: 'scholarly', evidenceState: 'scholarly', publisher: 'OpenAlex' },
  { url: 'https://archive.org/', sourceClass: 'archive', evidenceState: 'archival', publisher: 'Internet Archive' }
];

const store = new NoogleIndexStore('data/noogle-index.json');
await store.load();

for (const seed of seeds) {
  try {
    const doc = await crawlPublicSource(seed.url, seed);
    store.upsert(doc);
    console.log(`Indexed ${doc.title}`);
  } catch (error) {
    console.warn(`Skipped ${seed.url}: ${error.message}`);
  }
}

await store.save();
await fs.mkdir('public/api/noogle', { recursive: true });
const snapshot = JSON.parse(await fs.readFile('data/noogle-index.json', 'utf8'));
await fs.writeFile('public/api/noogle/index.json', JSON.stringify(snapshot, null, 2));
console.log(`Noogle native index contains ${snapshot.documents.length} documents`);
