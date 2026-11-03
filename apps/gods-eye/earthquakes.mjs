import { createHash } from 'node:crypto';
export const SOURCE = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const LIMIT = 2 * 1024 * 1024;
function timestamp(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 8640000000000000) throw new Error('Invalid timestamp');
  return new Date(value).toISOString();
}
export function normalizeSnapshot(raw, { now = Date.now(), simulated = true, maxAgeMs = 300000 } = {}) {
  timestamp(now);
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) throw new Error('Invalid expiry');
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > LIMIT) throw new Error('Response limit');
  const data = JSON.parse(raw);
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Invalid collection');
  const generated = data.metadata?.generated;
  timestamp(generated);
  if (generated > now + 60000) throw new Error('Future feed');
  const state = simulated ? 'simulated' : now - generated > maxAgeMs ? 'stale' : 'live';
  const hash = createHash('sha256').update(raw).digest('hex');
  const ids = new Set();
  return data.features.map(f => {
    if (f?.type !== 'Feature' || typeof f.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(f.id) || ids.has(f.id)) throw new Error('Invalid or duplicate event ID');
    ids.add(f.id);
    const c = f.geometry?.coordinates;
    if (f.geometry?.type !== 'Point' || !Array.isArray(c) || c.length !== 3 || !c.every(Number.isFinite) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) throw new Error('Invalid coordinates');
    const p = f.properties;
    const observedAt = timestamp(p?.time);
    if (p.time > now + 60000 || (p.mag !== null && (!Number.isFinite(p.mag) || p.mag > 10))) throw new Error('Invalid event');
    return { provider: 'USGS', sourceUrl: SOURCE, eventUrl: `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`, eventId: f.id, observedAt, fetchedAt: timestamp(now), generatedAt: timestamp(generated), geometry: { type: 'Point', coordinates: [...c] }, magnitude: p.mag, title: typeof p.place === 'string' ? p.place.slice(0, 300) : 'Earthquake', state, rawSha256: hash, attribution: 'U.S. Geological Survey', termsUrl: 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits' };
  });
}
export function toGasRecord(observation) {
  return { id: `GODSEYE-USGS-${observation.eventId}`, recordType: 'indicator', title: `USGS earthquake: ${observation.title}`, status: 'DRAFT', domain: 'Humanitarian', confidence: 'LOW', createdAt: observation.fetchedAt, updatedAt: observation.fetchedAt, summary: `Public environmental observation; feed state: ${observation.state}. Requires source review before operational use.`, provenance: { sourceType: 'public-source', sourceRefs: [observation.sourceUrl, observation.eventUrl], observation }, guardrailClass: 'HUMANITARIAN' };
}
// No caller-supplied URL, redirect following, credential forwarding or persistence.
export async function fetchEarthquakes({ fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  try {
    const response = await fetchImpl(SOURCE, { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Accept: 'application/geo+json, application/json' } });
    if (!response.ok || !response.body) throw new Error('Unavailable');
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > LIMIT) throw new Error('Response limit');
        chunks.push(Buffer.from(value));
      }
    } finally { await reader.cancel().catch(() => {}); }
    const raw = Buffer.concat(chunks).toString('utf8');
    const observations = normalizeSnapshot(raw, { now, simulated: false });
    const generated = JSON.parse(raw).metadata.generated;
    return { state: now - generated > 300000 ? 'stale' : 'live', generatedAt: timestamp(generated), fetchedAt: timestamp(now), observations, records: observations.map(toGasRecord) };
  } catch { return { state: 'unavailable', observations: [], records: [] }; }
}
