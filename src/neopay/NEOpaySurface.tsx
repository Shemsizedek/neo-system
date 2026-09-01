import {useState} from 'react'
import {NEOpayWallet} from './NEOpayWallet'
import {WalletConnectionCenter} from './WalletConnectionCenter'
import {NEOpaySecurityOverlay} from './NEOpaySecurityOverlay'
import {NEOpayContactCenter} from './NEOpayContactCenter'
import {NativeBitcoinSendOverlay} from './NativeBitcoinSendOverlay'
import {NEOpayReceiptCenter} from './NEOpayReceiptCenter'

type Tool='wallets'|'security'|'contacts'|'native-send'|'receipts'|null

export function NEOpaySurface({bankHref}:{bankHref:string}){
 const[tool,setTool]=useState<Tool>(null)
 const open=(next:Exclude<Tool,null>)=>setTool(v=>v===next?null:next)
 return <div className="neopay-route neopay-clean">
  <NEOpayWallet/>
  <section className="neopay-tools-dock" aria-label="NEOpay tools">
   <div className="neopay-tools-head"><div><strong>More</strong><span>Connection, security, contacts, receipts and advanced send tools</span></div><a href={bankHref}>∞ NEO Bank</a></div>
   <div className="neopay-tools-tabs">
    <button className={tool==='wallets'?'active':''} onClick={()=>open('wallets')}>Wallets</button>
    <button className={tool==='security'?'active':''} onClick={()=>open('security')}>Security</button>
    <button className={tool==='contacts'?'active':''} onClick={()=>open('contacts')}>Contacts</button>
    <button className={tool==='receipts'?'active':''} onClick={()=>open('receipts')}>Receipts</button>
    <button className={tool==='native-send'?'active':''} onClick={()=>open('native-send')}>Advanced</button>
   </div>
   {tool&&<div className="neopay-tools-panel">{tool==='wallets'&&<WalletConnectionCenter/>}{tool==='security'&&<NEOpaySecurityOverlay/>}{tool==='contacts'&&<NEOpayContactCenter/>}{tool==='receipts'&&<NEOpayReceiptCenter/>}{tool==='native-send'&&<NativeBitcoinSendOverlay/>}</div>}
  </section>
 </div>
}
