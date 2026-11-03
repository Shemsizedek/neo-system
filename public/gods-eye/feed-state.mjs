const SOURCE='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
export function observationView(payload,now=Date.now()){
 if(!['live','stale'].includes(payload?.state)||!Array.isArray(payload.observations)||payload.observations.length>5000)throw Error('Unavailable');
 const ids=new Set();let state=payload.state;
 const events=payload.observations.map(o=>{
  const c=o.geometry?.coordinates;
  if(o.provider!=='USGS'||o.sourceUrl!==SOURCE||typeof o.eventId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(o.eventId)||ids.has(o.eventId)||o.eventUrl!==`https://earthquake.usgs.gov/earthquakes/eventpage/${o.eventId}`||!['live','stale'].includes(o.state)||!(/^[a-f0-9]{64}$/).test(o.rawSha256)||o.geometry?.type!=='Point'||!Array.isArray(c)||c.length!==3||!c.every(Number.isFinite)||Math.abs(c[0])>180||Math.abs(c[1])>90||typeof o.title!=='string'||o.title.length>300||(o.magnitude!==null&&!Number.isFinite(o.magnitude)))throw Error('Invalid observation');
  ids.add(o.eventId);
  for(const field of ['observedAt','fetchedAt','generatedAt'])if(typeof o[field]!=='string'||!Number.isFinite(Date.parse(o[field]))||Date.parse(o[field])>now+60000)throw Error('Invalid observation time');
  if(o.state==='stale'||now-Date.parse(o.generatedAt)>300000)state='stale';
  return {id:o.eventId,title:o.title,lon:c[0],lat:c[1],mag:o.magnitude,observation:o};
 });
 return {state,events};
}
export function observationRecords(view,now=Date.now()){
 return view.events.map(e=>{const o=e.observation;return {id:`GODSEYE-USGS-${o.eventId}`,recordType:'indicator',title:`USGS earthquake: ${o.title}`,status:'DRAFT',domain:'Humanitarian',confidence:'LOW',createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString(),summary:`Public environmental observation; feed state: ${view.state}. Requires source review before operational use.`,provenance:{sourceType:'public-source',sourceRefs:[o.sourceUrl,o.eventUrl],state:view.state,observation:{...o,state:view.state}},guardrailClass:'HUMANITARIAN'};});
}
