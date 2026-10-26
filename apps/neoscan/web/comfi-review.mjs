import {importComfiSource,displayExactAmount,MAX_IMPORT_BYTES} from './comfi-import.mjs';
const $=id=>document.getElementById(id);let graph=null,generation=0;
function cell(row,value){const td=document.createElement('td');td.textContent=value;row.append(td);}
function list(id,items){$(id).replaceChildren();for(const text of items.length?items:['None identified in this import.']){const li=document.createElement('li');li.textContent=text;$(id).append(li);}}
function render(){
  const query=$('filter').value.toLowerCase();$('records').replaceChildren();
  for(const r of graph.records.filter(r=>[r.id,r.ledger,r.account,r.reference,r.unit].join(' ').toLowerCase().includes(query))){
    const tr=document.createElement('tr');cell(tr,r.id+' · '+r.kind);cell(tr,r.ledger+' / '+r.account);cell(tr,r.reference+' / '+r.effectiveDate);cell(tr,displayExactAmount(r)+' '+r.unit);cell(tr,r.evidenceState+' · '+r.sourceRefs.join('; '));$('records').append(tr);
  }
  $('project').textContent=graph.projectId;
  list('links',graph.links.map(l=>l.id+': '+l.from+' → '+l.to+' · '+l.type+' · '+l.status+(l.termsRef?' · terms: '+l.termsRef:'')));
  list('interests',graph.sharedEconomicInterests.map(i=>i.id+': '+i.recordIds.join(', ')+' · consolidation review required'));
}
function reset(){generation++;graph=null;$('review').hidden=true;$('records').replaceChildren();$('links').replaceChildren();$('interests').replaceChildren();$('project').textContent='';$('status').textContent='No source loaded.';}
$('clear').addEventListener('click',()=>{reset();$('importForm').reset();$('filter').value='';});
$('filter').addEventListener('input',()=>{if(graph)render();});
$('importForm').addEventListener('submit',async event=>{
  event.preventDefault();reset();const ticket=generation;
  try{const file=$('sourceFile').files[0];if(!file||file.size>MAX_IMPORT_BYTES)throw Error('Select a JSON file no larger than 2 MiB.');
    const authorized=$('authorized').checked,sourceRef=$('sourceRef').value;const text=await file.text();if(ticket!==generation)return;
    graph=importComfiSource(text,{authorized,sourceRef});render();$('review').hidden=false;$('status').textContent=graph.records.length+' records imported for local review.';
  }catch(error){if(ticket===generation)$('status').textContent='Import rejected: '+error.message;}
});
