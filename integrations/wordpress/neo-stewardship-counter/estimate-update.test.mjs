import assert from 'node:assert/strict';
import {mountStewardship} from './checkout.mjs';
const old={fetch:globalThis.fetch,location:globalThis.location,history:globalThis.history};
const attrs={'data-selected-ledger':'cp20','data-currency':'btc','data-pricing-url':'https://example.test/wp-json/neo-counter/v1/rates'};
const nodes=Object.fromEntries(['data-total','data-subtotal','data-fees','data-price-status','data-order-asset','data-order-quantity','data-order-ledger','data-order-currency'].map(k=>['['+k+']',{textContent:'',value:''}]));
const events={},button={disabled:false};const settings={elements:{neo_ledger:{value:'classic'},neo_currency:{value:'btc'}},addEventListener:(k,f)=>events[k]=f,querySelector:()=>button};
const form={elements:{purpose:{value:'patronage'},quantity:{value:'2',validity:{valid:true}}},addEventListener:()=>{}};
const root={querySelector:s=>s==='[data-estimate-settings]'?settings:s==='[data-quote-form]'?form:nodes[s],getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v,dispatchEvent:()=>{}};
const ref={currency:'BTC',currencyAsset:'BTC',currencyDecimals:8,source:'fixture',referenceId:'ref',observedAt:1000,expiresAt:2000,unitPriceMinor:'50000',spreadBps:'900',feeAllowanceMinor:'0',processorFeeBps:'0',roundingMinor:'1',conversion:{bondPriceSats:'50000',currencyPriceSats:'100000000',scale:'100000000'}};
let calls=[],replaced=0,fail=false;
globalThis.location={origin:'https://example.test',href:'https://example.test/holy-stewardship/'};globalThis.history={replaceState:()=>replaced++};
globalThis.fetch=async url=>{calls.push(new URL(url));if(fail)throw Error('offline');return {ok:true,json:async()=>({references:{PLEDGEBOND:ref,TEMPLEBOND:ref}})};};
try{
 mountStewardship(root,{PLEDGEBOND:ref},()=>1500,()=>0,()=>{});
 let prevented=false;events.submit({preventDefault:()=>prevented=true});await new Promise(r=>setImmediate(r));
 assert(prevented);assert.equal(nodes['[data-total]'].textContent,'0.00109000 BTC');assert.equal(attrs['data-selected-ledger'],'classic');assert.equal(nodes['[data-order-ledger]'].value,'classic');assert.equal(nodes['[data-order-currency]'].value,'btc');assert.equal(button.disabled,false);assert.equal(replaced,1);assert.equal(calls.at(-1).searchParams.get('v'),'0.21.0');
 fail=true;events.submit({preventDefault(){}});await new Promise(r=>setImmediate(r));assert.match(nodes['[data-price-status]'].textContent,/Could not update/);assert.equal(button.disabled,false);
 console.log('PASS: in-place estimate update, prevented navigation, selected context, exact quantity total and retry state');
}finally{for(const k of Object.keys(old)){if(old[k]===undefined)delete globalThis[k];else globalThis[k]=old[k];}}
