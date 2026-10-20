import {useState} from 'react';
import {inspectNeoMaskProvider} from './neoMaskBridge.mjs';
declare global {interface Window {neoMask?:unknown}}
export function NeoMaskAvailability(){
 const [state,setState]=useState(()=>inspectNeoMaskProvider(typeof window==='undefined'?undefined:window.neoMask));
 return <section aria-label="NeoMask Bitcoin and Counterparty" style={{padding:12,border:'1px solid currentColor',borderRadius:10,marginTop:12}}>
  <h3>NeoMask · Bitcoin / Counterparty</h3>
  <p>{state.compatible?'Provider detected. Authenticated wallet pairing is required before revealing accounts or balances.':'Not connected. NeoMask provider support is staged; wallet access is unavailable until a verified extension and NEO Pass session are active.'}</p>
  <p>BTC · XCP · NOMNI · Counterparty assets · Crown Chain (not enabled)</p>
  <button type="button" onClick={()=>setState(inspectNeoMaskProvider(window.neoMask))}>Detect NeoMask</button>
 </section>
}
