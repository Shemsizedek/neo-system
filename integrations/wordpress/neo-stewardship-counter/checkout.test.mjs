import assert from 'node:assert/strict';
import { mountStewardship } from './checkout.mjs';
const fixture={currency:'BTC',unitPriceMinor:'1000',feeAllowanceMinor:'150',spreadBps:'100',processorFeeBps:'290',roundingMinor:'100',source:'TEST FIXTURE',referenceId:'test',observedAt:1000,expiresAt:301000};
function setup(references, received = '1') {
 const listeners={}, selectListeners={};
 const select={value:'patronage',selectedIndex:0,options:[{text:'Citizen'},{text:'Adept'}],addEventListener:(k,fn)=>selectListeners[k]=fn};
 const form={elements:{purpose:select,quantity:{value:'2'}},reportValidity:()=>true,addEventListener:(k,fn)=>listeners[k]=fn};
 const nodes={'[data-quote-form]':form,'output':{textContent:''},'[data-price-status]':{},'[data-description]':{},'[data-protection]':{},'[data-asset]':{}};
 let expire;
 mountStewardship({querySelector:k=>nodes[k],getAttribute:()=>received},references,()=>2000,fn=>{expire=fn;return 1},()=>{expire=undefined});
 const submit=()=>listeners.submit({preventDefault(){}});
 return {nodes,select,selectListeners,listeners,submit,expire:()=>expire()};
}
const s=setup({PLEDGEBOND:fixture,TEMPLEBOND:{...fixture,unitPriceMinor:'2000'}});
s.submit();
assert.match(s.nodes.output.textContent,/Total preview: 0.00002300 BTC/);
assert.match(s.nodes.output.textContent,/Percentage processing fee: 0.00000067 BTC/);
s.listeners.input();assert.equal(s.nodes.output.textContent,'');
s.select.value='adept';s.select.selectedIndex=1;s.selectListeners.change();s.submit();
assert.match(s.nodes.output.textContent,/TEMPLEBOND/);
s.expire();assert.match(s.nodes.output.textContent,/Quote expired/);
const absent=setup({});absent.submit();assert.match(absent.nodes.output.textContent,/Quote unavailable/);
const stale=setup({PLEDGEBOND:{...fixture,expiresAt:1500}});stale.submit();assert.match(stale.nodes.output.textContent,/Quote unavailable/);
s.select.value='patronage';s.selectListeners.change();s.nodes['[data-quote-form]'].elements.quantity.value='0';s.submit();assert.match(s.nodes.output.textContent,/Quote unavailable/);
console.log('PASS: connected quote rendering, fees, path switch, edits, expiry, missing/stale prices, invalid quantity');

const blocked=setup({PLEDGEBOND:fixture},'0');blocked.submit();assert.match(blocked.nodes.output.textContent,/Upload your completed Form 144/);

