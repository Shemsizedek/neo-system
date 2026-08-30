const SURFACE_RULES = Object.freeze({
  transactions: [/(^|\W)transaction(s)?(\W|$)/i, /trade(s)?/i, /payment(s)?/i],
  offerings: [/(^|\W)offer(ing)?s?(\W|$)/i],
  publications: [/publication(s)?/i, /document(s)?/i, /upload/i],
  memberships: [/member(ship)?s?/i, /coordinator/i],
  manage: [/(^|\W)manage(ment)?(\W|$)/i, /admin(istration)?/i, /settings?/i],
  stats: [/stat(s|istics)?/i, /report(s)?/i, /system health/i],
  'virtual-trader': [/virtual[\s_-]*trader/i, /virtual\.asp/i],
});

export function generateLegacyRouteCandidates(manifest, { minScore = 25 } = {}) {
  if (!manifest?.discoveredLinks) return [];
  const candidates = [];

  for (const link of manifest.discoveredLinks) {
    const haystack = `${link.text || ''} ${link.path || ''} ${link.url || ''}`;
    for (const [surface, rules] of Object.entries(SURFACE_RULES)) {
      let score = 0;
      const evidence = [];
      for (const rule of rules) {
        if (rule.test(haystack)) {
          score += 30;
          evidence.push(rule.source);
        }
      }
      if (surface === 'virtual-trader' && /\/win\/virtual\.asp/i.test(link.path || '')) {
        score += 70;
        evidence.push('known-legacy-virtual-trader-path');
      }
      if (score < minScore) continue;
      candidates.push(Object.freeze({
        surface,
        path: link.path,
        url: link.url,
        text: link.text || '',
        score: Math.min(score, 100),
        confidence: confidenceFromScore(score),
        evidence,
        status: 'quarantined',
        trusted: false,
      }));
    }
  }

  return dedupeCandidates(candidates)
    .sort((a, b) => b.score - a.score || a.surface.localeCompare(b.surface));
}

export function reviewLegacyRouteCandidate(candidate, { approved = false, reviewer, note = '' } = {}) {
  if (!candidate) throw new Error('candidate is required');
  if (!reviewer) throw new Error('reviewer is required');
  return Object.freeze({
    ...candidate,
    status: approved ? 'reviewed-approved' : 'reviewed-rejected',
    trusted: false,
    review: Object.freeze({ approved: Boolean(approved), reviewer, note, reviewedAt: new Date().toISOString() }),
  });
}

export function promoteLegacyRouteCandidate(candidate) {
  if (candidate?.status !== 'reviewed-approved' || !candidate?.review?.approved) {
    throw new Error('legacy route candidate must be reviewed and approved before promotion');
  }
  return Object.freeze({
    surface: candidate.surface,
    path: candidate.path,
    url: candidate.url,
    source: 'discovery-manifest',
    score: candidate.score,
    confidence: candidate.confidence,
    trusted: true,
    promotedAt: new Date().toISOString(),
    review: candidate.review,
  });
}

function confidenceFromScore(score) {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function dedupeCandidates(candidates) {
  const best = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.surface}|${candidate.path}`;
    const previous = best.get(key);
    if (!previous || candidate.score > previous.score) best.set(key, candidate);
  }
  return [...best.values()];
}
