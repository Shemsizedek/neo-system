import {pathToFileURL} from 'node:url';
import {fetchEarthquakes} from './earthquakes.mjs';
import {observationView} from '../../public/gods-eye/feed-state.mjs';
export async function probe({fetchSnapshot=fetchEarthquakes,now=Date.now}={}){
 const snapshot=await fetchSnapshot();
 const view=observationView(snapshot,now());
 return {result:'validated',state:view.state,eventCount:view.events.length,generatedAt:view.generatedAt,fetchedAt:view.fetchedAt,provider:'USGS',sourceUrl:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',snapshotSha256:snapshot.observations[0]?.rawSha256??null,scope:'Read-only source/format check; no emergency or operational certification'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(await probe(),null,2));}catch{console.error(JSON.stringify({result:'unavailable-or-invalid',provider:'USGS'}));process.exitCode=1;}
}
