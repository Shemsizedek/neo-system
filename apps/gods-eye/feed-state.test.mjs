import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSnapshot} from './earthquakes.mjs';
import {observationView,observationRecords} from '../../public/gods-eye/feed-state.mjs';
const now=1793700000000;
const payload=()=>({state:'live',observations:normalizeSnapshot(JSON.stringify({type:'FeatureCollection',metadata:{generated:now},features:[{type:'Feature',id:'test01',geometry:{type:'Point',coordinates:[0,0,0]},properties:{mag:null,time:now}}]}),{now,simulated:false})});
test('validated source observations become public-source drafts and age to stale',()=>{
 const view=observationView(payload(),now);assert.equal(view.state,'live');assert.equal(view.events[0].mag,null);
 assert.equal(observationRecords(view,now)[0].provenance.sourceType,'public-source');
 assert.equal(observationView(payload(),now+300001).state,'stale');
});
test('unavailable, synthetic, malformed and duplicate data never become live',()=>{
 assert.throws(()=>observationView({state:'unavailable'},now));
 for(const mutate of [p=>p.observations[0].state='simulated',p=>p.observations[0].sourceUrl='https://example.com',p=>p.observations[0].rawSha256='invalid',p=>p.observations[0].generatedAt='tomorrow',p=>p.observations[0].geometry.coordinates[1]=91,p=>p.observations.push(p.observations[0])]){const p=payload();mutate(p);assert.throws(()=>observationView(p,now));}
});
