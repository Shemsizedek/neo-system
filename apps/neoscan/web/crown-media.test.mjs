import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const script=await readFile(new URL('./crown-media.js',import.meta.url),'utf8');
const html=await readFile(new URL('./index.html',import.meta.url),'utf8');

function harness({initial='NOMNI'}={}){
 const scanListeners=new Map(),mediaListeners=new Map();
 const frame={src:''},mediaForm={addEventListener:(type,fn)=>mediaListeners.set(type,fn)};
 const input={value:initial,closest:()=>mediaForm};
 const scanInput={value:'NOMNI'};
 const document={
  baseURI:'https://shemsizedek.github.io/neo-system/neoscan/',
  getElementById:id=>({
   crownAssetFrame:frame,crownAssetInput:input,
   scanForm:{addEventListener:(type,fn)=>scanListeners.set(type,fn)},
   scanInput
  })[id]??null
 };
 runInNewContext(script,{document,URL,encodeURIComponent});
 return {frame,input,scanInput,scanListeners,mediaListeners};
}

test('NOMNI is displayed via independent GitHub Pages asset presentation, not the suspended domain',()=>{
 const a=harness();
 assert.equal(a.frame.src,'https://shemsizedek.github.io/neo-system/crown-chain/');
 a.scanInput.value='NOMNI';
 a.scanListeners.get('submit')();
 assert.equal(a.frame.src,'https://shemsizedek.github.io/neo-system/crown-chain/');
});

test('NOMNI asset-media form stays on mirror; other assets keep canonical behavior',()=>{
 const a=harness();
 let prevented=false;
 a.input.value='nomni';
 a.mediaListeners.get('submit')({preventDefault:()=>{prevented=true}});
 assert.equal(prevented,true);
 assert.equal(a.frame.src,'https://shemsizedek.github.io/neo-system/crown-chain/');
 a.scanInput.value='KNOWINDEX';
 a.scanListeners.get('submit')();
 assert.equal(a.frame.src,'https://crown.holytemples.org/assets/KNOWINDEX/explore.html');
});

test('NEOscan includes an independent World Temple presentation link',()=>{
 assert.match(html,/href="https:\/\/holytemples\.org\/crown-chain\/"/);
 assert.match(html,/src="\.\.\/crown-chain\/"/);
 assert.match(html,/value="NOMNI"/);
});
