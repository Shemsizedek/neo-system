import {useState} from 'react'
type Device={deviceRef:string;compatibility:{eligible:boolean;reason:string}}
type Service={deviceRef:string|null;state:string;providerStatus:string;eSimStatus:string}
type Portal={brand:string;memberId:string;services:Service[];devices:Device[];provisioning:string;activationEnabled:boolean}
export function NeoTeleMemberPanel({loadPortal}:{loadPortal:()=>Promise<Portal>}){
 const [portal,setPortal]=useState<Portal|null>(null)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const refresh=async()=>{setBusy(true);setError('');try{setPortal(await loadPortal())}catch{setError('Unable to load NeoTele membership. Please sign in to NEOpass.')}finally{setBusy(false)}}
 return <section className="wire-card" aria-label="NeoTele member dashboard">
   <div className="wire-row"><div><div className="wire-label">NEOTELE • CHAPLAINCY PILOT</div><h2>My Cellular Service</h2></div><button className="wire-btn secondary" disabled={busy} onClick={()=>void refresh()}>{busy?'Loading…':'Check service'}</button></div>
   <p>NeoTele is preparing its NEO Wire and Noogle Fi eSIM service. Carrier activation is not available yet.</p>
   {error&&<p role="alert">{error}</p>}
   {portal&&<><p><strong>Network provisioning:</strong> {portal.provisioning}</p>
    <h3>Registered devices</h3><ul>{portal.devices.map(d=><li key={d.deviceRef}>{d.deviceRef} — {d.compatibility.eligible?'Preliminarily eligible':'Not yet eligible'} ({d.compatibility.reason})</li>)}</ul>
    <h3>My requests</h3><ul>{portal.services.map((s,i)=><li key={i}>{s.deviceRef??'Device pending'} — {s.state} — {s.eSimStatus}</li>)}</ul>
    {!portal.activationEnabled&&<p>Activation QR and carrier profile delivery are disabled pending an authorized provider.</p>}
   </>}
 </section>
}
