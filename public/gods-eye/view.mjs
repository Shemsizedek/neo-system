import { project } from './globe.mjs';
import { observationView, observationRecords } from './feed-state.mjs';
const demoEvents = [ { id:'synthetic-nc', title:'Synthetic North Carolina example', lon:-79, lat:35, mag:2.8 }, { id:'synthetic-pacific', title:'Synthetic Pacific example', lon:140, lat:36, mag:4.1 } ];
let events=demoEvents, mode='simulated', generation=0, request;
const ns = 'http://www.w3.org/2000/svg';
function draw() {
 const center = Number(document.querySelector('#rotation').value);
 document.querySelector('#angle').textContent = `${Math.abs(center)}° ${center < 0 ? 'W' : 'E'}`;
 const grid = document.querySelector('#grid'); grid.replaceChildren();
 for (let lat=-60;lat<=60;lat+=30) {
  const pts=[]; for(let lon=center-90;lon<=center+90;lon+=3){const p=project(lon,lat,center);pts.push(`${p.x},${p.y}`);}
  const line=document.createElementNS(ns,'polyline');line.setAttribute('points',pts.join(' '));grid.append(line);
 }
 for(let offset=-60;offset<=60;offset+=30){const pts=[];for(let lat=-90;lat<=90;lat+=3){const p=project(center+offset,lat,center);pts.push(`${p.x},${p.y}`);}const line=document.createElementNS(ns,'polyline');line.setAttribute('points',pts.join(' '));grid.append(line);}
 const points=document.querySelector('#points');points.replaceChildren();
 for(const event of events){const p=project(event.lon,event.lat,center);if(!p.visible)continue;const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('r','6');const title=document.createElementNS(ns,'title');title.textContent=event.title;circle.append(title);points.append(circle);}
}
function render(){
 const list=document.querySelector('#events');list.replaceChildren();
 for(const e of events){const li=document.createElement('li');li.textContent=`${e.title} • M${e.mag??'unknown'} • ${e.lat}, ${e.lon} • ${mode.toUpperCase()}`;list.append(li);}
 document.querySelector('#state').textContent=`${mode.toUpperCase()} • ${events.length} events`;
 document.querySelector('#export').disabled=!['simulated','live','stale'].includes(mode);
 document.querySelector('#export').textContent=`Download ${mode} NEO-GAS records`;
 document.querySelector('#feed-note').textContent=mode==='simulated'?'Synthetic demonstration only; no USGS reports displayed.':mode==='unavailable'?'Staging feed unavailable or disabled. No events are displayed.':'Credit: U.S. Geological Survey. Feed observations may be delayed or revised. Exports remain drafts.';
 draw();
}
function refreshAge(){if(mode==='live'&&events.some(e=>Date.now()-Date.parse(e.observation.generatedAt)>300000)){mode='stale';render();}}
setInterval(refreshAge,10000);
document.querySelector('#demo').addEventListener('click',()=>{generation++;request?.abort();events=demoEvents;mode='simulated';render();});
document.querySelector('#load-feed').addEventListener('click',async()=>{
 const current=++generation;request?.abort();request=new AbortController();
 mode='loading';events=[];render();
 try{
  const response=await fetch(new URL('./api/earthquakes',location.href),{signal:AbortSignal.any([request.signal,AbortSignal.timeout(12000)]),credentials:'omit',redirect:'error',cache:'no-store'});
  if(!response.ok)throw Error('Unavailable');
  const view=observationView(await response.json());
  if(current!==generation)return;
  mode=view.state;events=view.events;
 }catch{if(current!==generation)return;mode='unavailable';events=[];}
 render();
});
document.querySelector('#rotation').addEventListener('input',draw);
document.querySelector('#export').addEventListener('click',()=>{
 refreshAge();
 if(!['simulated','live','stale'].includes(mode))return;
 const time=new Date().toISOString();
 const records=mode!=='simulated'?observationRecords({state:mode,events}):events.map(e=>({id:e.id,recordType:'indicator',title:e.title,status:'DRAFT',domain:'Humanitarian',confidence:'LOW',createdAt:time,updatedAt:time,summary:'Synthetic demonstration only; not an observed earthquake.',provenance:{sourceType:'system',sourceRefs:['public/gods-eye/view.mjs'],state:'simulated'},guardrailClass:'HUMANITARIAN'}));
 const url=URL.createObjectURL(new Blob([JSON.stringify(records,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`neo-gods-eye-${mode}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
