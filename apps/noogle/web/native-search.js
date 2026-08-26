(() => {
  const nativeIndexUrl = new URL('../api/noogle/index.json', location.href).href;
  const originalSearchKnowledge = window.searchKnowledge;
  if (typeof originalSearchKnowledge !== 'function') return;

  let nativeSnapshotPromise;

  function loadNativeSnapshot() {
    if (!nativeSnapshotPromise) {
      nativeSnapshotPromise = fetch(nativeIndexUrl, { headers: { accept: 'application/json' } })
        .then(response => {
          if (!response.ok) throw new Error(`Native index ${response.status}`);
          return response.json();
        })
        .catch(error => {
          console.warn('Noogle native index unavailable:', error.message);
          return { documents: [] };
        });
    }
    return nativeSnapshotPromise;
  }

  function scoreNativeDocument(doc, query) {
    const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    const communityTerms = (doc.communityTerms || []).flatMap(item => [item.term, ...(item.aliases || [])]).join(' ');
    const haystack = `${doc.title || ''} ${doc.summary || ''} ${doc.publisher || ''} ${communityTerms}`.toLowerCase();
    const matched = terms.filter(term => haystack.includes(term));
    const termCoverage = terms.length ? matched.length / terms.length : 0;
    const baseRank = Number(doc.rank?.score || 0);
    const score = Math.min(1, termCoverage * 0.72 + baseRank * 0.28);
    return { score, matched, termCoverage };
  }

  function nativeItems(snapshot, query) {
    return (snapshot.documents || [])
      .map(doc => ({ doc, ...scoreNativeDocument(doc, query) }))
      .filter(item => item.matched.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ doc, score, matched, termCoverage }) => {
        const rankReasons = [
          ...(doc.rank?.reasons || []),
          `query coverage ${(termCoverage * 100).toFixed(0)}%`,
          `matched: ${matched.join(', ')}`
        ];
        return {
          title: doc.title || doc.canonicalUrl || doc.url,
          description: `${doc.summary || 'No summary available.'} · Why ranked: ${rankReasons.join(' · ')}`,
          status: String(doc.evidenceState || doc.sourceClass || 'NATIVE').toUpperCase(),
          source: `NOOGLE NATIVE · ${doc.publisher || doc.sourceClass || 'indexed source'}`,
          url: doc.canonicalUrl || doc.url,
          noogleNative: true,
          noogleRank: score,
          provenance: {
            contentHash: doc.contentHash,
            retrievedAt: doc.retrievedAt,
            sourceClass: doc.sourceClass,
            evidenceState: doc.evidenceState,
            communities: doc.communities || []
          }
        };
      });
  }

  function coverageQuality(items) {
    if (!items.length) return 0;
    const top = items[0]?.noogleRank || 0;
    const breadth = Math.min(1, items.length / 4);
    return top * 0.7 + breadth * 0.3;
  }

  window.searchKnowledge = async function nativeFirstSearchKnowledge(query) {
    const snapshot = await loadNativeSnapshot();
    const native = nativeItems(snapshot, query);
    const quality = coverageQuality(native);

    if (native.length >= 2 && quality >= 0.56) {
      return { items: native, failures: 0, nativeFirst: true, federatedFallback: false };
    }

    const federated = await originalSearchKnowledge(query);
    const combined = [...native, ...(federated.items || [])];
    const seen = new Set();
    const items = combined.filter(item => {
      const key = String(item.url || `${item.source}:${item.title}`).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 18);

    return {
      items,
      failures: federated.failures || 0,
      nativeFirst: native.length > 0,
      federatedFallback: true
    };
  };
})();
