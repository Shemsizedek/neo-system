import {useState} from 'react';
import {currentSession} from '../auth/session';
import {walletStatus} from './bridge.mjs';
export default function NeoMaskPanel(){
 const [open,setOpen]=useState(false);
 const session=currentSession();
 const state=walletStatus({session,providerAvailable:false});
 return <aside aria-label="NeoMask wallet integration" style={{margin:'12px',padding:'12px',border:'1px solid #658178',borderRadius:12}}>
  <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>NeoMask Wallet · {open?'Close':'Open'}</button>
  {open&&<section><h3>Bitcoin + Counterparty Wallet</h3><p>NEO Pass wallet connection and authenticated provider runtime are not configured on this deployment.</p><p>Access: {state.reason.replaceAll('_',' ')}</p><p>BTC · XCP · NOMNI · Counterparty assets</p><p>Balances, receiving addresses and transfers remain unavailable until the trusted wallet service verifies them. No transaction can be authorized here.</p></section>}
 </aside>;
}