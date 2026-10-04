import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSystemHome } from './system-home.mjs';

function makeHarness(html, respond) {
  const nodes = new Map();
  const element = () => ({
    dataset:{}, value:'', hidden:false, textContent:'', children:[], listeners:{}, disabled:false, isConnected:true,
    addEventListener(name, fn){this.listeners[name]=fn},
    setAttribute(name,value){this[name]=value},
    append(...items){this.children.push(...items)},
    replaceChildren(...items){this.children=items},
    focus(){this.focused=true}
  });
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes.set(match[1],element());
  const cards=[...html.matchAll(/data-category="([^"]+)" data-search="([^"]+)"/g)].map(match=>Object.assign(element(),{dataset:{category:match[1],search:match[2]}}));
  const filters=[...html.matchAll(/data-filter="([^"]+)" aria-pressed="([^"]+)"/g)].map(match=>Object.assign(element(),{dataset:{filter:match[1]},'aria-pressed':match[2]}));
  nodes.get('library-form').elements={q:element()};
  const document={
    hidden:false,getElementById:id=>nodes.get(id),
    querySelectorAll:selector=>selector==='.card'?cards:filters,
    createElement:element,addEventListener(){}
  };
  const paths=[];
  const fetch=async path=>{paths.push(path);return{ok:true,json:async()=>respond(path)}};
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Function('document','fetch','AbortSignal',script)(document,fetch,{timeout:()=>undefined});
  return{nodes,cards,filters,paths,async flush(){for(let i=0;i<20;i++)await Promise.resolve()}};
}

test('service category and text search combine, with an empty state', async()=>{
  const h=makeHarness(renderSystemHome(),()=>({ok:true}));
  await h.flush();
  assert.equal(h.nodes.get('status-text').textContent,'Gateway connected');
  h.filters.find(x=>x.dataset.filter==='Finance').listeners.click();
  assert.equal(h.cards.filter(x=>!x.hidden).length,3);
  h.nodes.get('service-search').value='scan';h.nodes.get('service-search').listeners.input();
  assert.equal(h.cards.filter(x=>!x.hidden).length,1);
  h.nodes.get('service-search').value='missing-service';h.nodes.get('service-search').listeners.input();
  assert.equal(h.nodes.get('services-empty').hidden,false);
});
test('library search encodes input and renders untrusted titles as text',async()=>{
  const h=makeHarness(renderSystemHome(),path=>path==='/health'?{ok:true}:{records:[{id:'a/b',title:'<img src=x onerror=alert(1)>',summary:'Public source'}]});
  h.nodes.get('library-form').elements.q.value='law & records';
  await h.nodes.get('library-form').listeners.submit({preventDefault(){},currentTarget:h.nodes.get('library-form')});
  assert.ok(h.paths.includes('/api/noogle/search?q=law%20%26%20records'));
  const link=h.nodes.get('library-results').children[0];
  assert.equal(link.href,'/api/library/a%2Fb');
  assert.equal(link.children[0].textContent,'<img src=x onerror=alert(1)>');
  assert.equal(h.nodes.get('library-submit').disabled,false);
});
test('failed gateway and library requests show honest errors and allow retry',async()=>{
  const h=makeHarness(renderSystemHome(),()=>{throw new Error('unavailable')});
  await h.flush();
  assert.equal(h.nodes.get('gateway-status').dataset.state,'offline');
  h.nodes.get('library-form').elements.q.value='records';
  await h.nodes.get('library-form').listeners.submit({preventDefault(){},currentTarget:h.nodes.get('library-form')});
  assert.match(h.nodes.get('library-message').textContent,/could not be reached/);
  assert.equal(h.nodes.get('library-submit').disabled,false);
});
