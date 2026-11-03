import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSnapshot, toGasRecord, fetchEarthquakes, SOURCE } from './earthquakes.mjs';
const now = 1793700000000;
const fixture = () => ({ type: 'FeatureCollection', metadata: { generated: now }, features: [{ type: 'Feature', id: 'test001', geometry: { type: 'Point', coordinates: [-79, 35, 4] }, properties: { time: now - 10000, mag: 2.8, place: 'Synthetic test event' } }] });
test('fixtures default to simulated and map to draft NEO-GAS indicators', () => {
 const [o] = normalizeSnapshot(JSON.stringify(fixture()), { now });
 assert.equal(o.state, 'simulated'); assert.match(o.rawSha256, /^[a-f0-9]{64}$/);
 const r = toGasRecord(o); assert.equal(r.status, 'DRAFT'); assert.equal(r.guardrailClass, 'HUMANITARIAN');
});
test('freshness uses feed generation rather than earthquake age', () => {
 const f = fixture(); f.features[0].properties.time = now - 86400000;
 assert.equal(normalizeSnapshot(JSON.stringify(f), { now, simulated: false })[0].state, 'live');
 f.metadata.generated = now - 600000;
 assert.equal(normalizeSnapshot(JSON.stringify(f), { now, simulated: false })[0].state, 'stale');
});
test('reject malformed coordinates, missing time, duplicate IDs and future feed', () => {
 for (const mutate of [f => f.features[0].geometry.coordinates[0] = 181, f => delete f.features[0].properties.time, f => f.features.push(f.features[0]), f => f.metadata.generated = now + 120000]) {
  const f = fixture(); mutate(f); assert.throws(() => normalizeSnapshot(JSON.stringify(f), { now }));
 }
});
test('fixed source and redirect policy; failures do not fabricate observations', async () => {
 const result = await fetchEarthquakes({ now, fetchImpl: async (url, options) => {
 assert.equal(url, SOURCE); assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, undefined);
 return new Response(JSON.stringify(fixture()));
 }});
 assert.equal(result.state, 'live'); assert.equal(result.records.length, 1);
 assert.equal((await fetchEarthquakes({ fetchImpl: async () => { throw new Error('secret'); } })).state, 'unavailable');
});
test('oversize stream is rejected', async () => {
 assert.equal((await fetchEarthquakes({ fetchImpl: async () => new Response('x'.repeat(2097153)) })).state, 'unavailable');
});
test('empty feeds preserve freshness and never infer health from row count', async()=>{
 for(const [age,state] of [[0,'live'],[600000,'stale']]) {
  const result=await fetchEarthquakes({now,fetchImpl:async()=>new Response(JSON.stringify({type:'FeatureCollection',metadata:{generated:now-age},features:[]}))});
  assert.equal(result.state,state);assert.deepEqual(result.observations,[]);
 }
});
