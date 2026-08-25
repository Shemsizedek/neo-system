const clamp = n => Math.max(0, Math.min(1, Number(n) || 0));

export function rankDocument(signals = {}) {
  const relevance = clamp(signals.relevance);
  const provenance = clamp(signals.provenance);
  const communityAuthority = clamp(signals.communityAuthority);
  const recency = clamp(signals.recency);
  const diversity = clamp(signals.diversity);

  const weights = signals.communitySpecific
    ? { relevance: .34, provenance: .25, communityAuthority: .25, recency: .06, diversity: .10 }
    : { relevance: .42, provenance: .30, communityAuthority: .08, recency: .10, diversity: .10 };

  const score = relevance * weights.relevance + provenance * weights.provenance +
    communityAuthority * weights.communityAuthority + recency * weights.recency + diversity * weights.diversity;

  const reasons = [
    `relevance ${relevance.toFixed(2)}`,
    `provenance ${provenance.toFixed(2)}`,
    signals.communitySpecific ? `community authority ${communityAuthority.toFixed(2)}` : null,
    `source diversity ${diversity.toFixed(2)}`
  ].filter(Boolean);

  return { score: Number(score.toFixed(4)), reasons, weights };
}
