import { reviewLegacyRouteCandidate, promoteLegacyRouteCandidate } from './ces-legacy-route-candidates.mjs';

export function createCesRouteReviewRegistry() {
  const records = new Map();

  function keyFor(exchangeId, surface) {
    if (!exchangeId) throw new Error('exchangeId is required');
    if (!surface) throw new Error('surface is required');
    return `${String(exchangeId).toUpperCase()}|${surface}`;
  }

  function review({ exchangeId, candidate, approved = false, reviewer, note = '' }) {
    if (!candidate?.surface) throw new Error('candidate surface is required');
    const reviewed = reviewLegacyRouteCandidate(candidate, { approved, reviewer, note });
    const record = Object.freeze({
      schema: 'neo.ces.legacy.route-review.v1',
      exchangeId: String(exchangeId).toUpperCase(),
      surface: candidate.surface,
      decision: approved ? 'approved' : 'rejected',
      candidate: reviewed,
      promoted: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    records.set(keyFor(exchangeId, candidate.surface), record);
    return record;
  }

  function promote({ exchangeId, surface }) {
    const key = keyFor(exchangeId, surface);
    const current = records.get(key);
    if (!current) throw new Error(`no CES route review exists for ${key}`);
    if (current.decision !== 'approved') throw new Error(`CES route review is not approved for ${key}`);
    const promoted = promoteLegacyRouteCandidate(current.candidate);
    const next = Object.freeze({
      ...current,
      promoted,
      updatedAt: new Date().toISOString(),
    });
    records.set(key, next);
    return next;
  }

  function get(exchangeId, surface) {
    return records.get(keyFor(exchangeId, surface)) || null;
  }

  function list(exchangeId) {
    const prefix = `${String(exchangeId || '').toUpperCase()}|`;
    return [...records.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value);
  }

  function listPromoted(exchangeId) {
    return list(exchangeId).filter((record) => record.promoted?.trusted === true);
  }

  return { review, promote, get, list, listPromoted };
}

export function buildTrustedLegacyRouteSet({ exchangeId, registry }) {
  if (!registry?.listPromoted) throw new Error('review registry is required');
  const promoted = registry.listPromoted(exchangeId);
  return Object.freeze(Object.fromEntries(promoted.map((record) => [record.surface, Object.freeze({
    ...record.promoted,
    exchangeId: String(exchangeId).toUpperCase(),
    reviewRecord: Object.freeze({
      decision: record.decision,
      reviewer: record.candidate.review.reviewer,
      note: record.candidate.review.note,
      reviewedAt: record.candidate.review.reviewedAt,
    }),
  })])));
}
