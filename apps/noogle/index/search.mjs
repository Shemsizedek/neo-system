import { NoogleIndexStore } from './store.mjs';

export async function searchNoogle(query, options = {}) {
  const store = new NoogleIndexStore(options.file || 'data/noogle-index.json');
  await store.load();
  const results = store.search(query, { limit: options.limit || 20 });
  return {
    query: String(query || ''),
    count: results.length,
    source: 'noogle-native-index-v1',
    results: results.map(doc => ({
      id: doc.id,
      title: doc.title,
      url: doc.canonicalUrl || doc.url,
      summary: doc.summary,
      sourceClass: doc.sourceClass,
      evidenceState: doc.evidenceState,
      publisher: doc.publisher,
      communities: doc.communities || [],
      communityTerms: doc.communityTerms || [],
      rank: doc.rank || null,
      provenance: {
        retrievedAt: doc.retrievedAt,
        contentHash: doc.contentHash,
        publishedAt: doc.publishedAt || null
      }
    }))
  };
}
