import {useCallback,useEffect,useState} from 'react'
import {Activity,AlertTriangle,ArrowLeft,CheckCircle2,Cpu,RefreshCw,ShieldCheck,Smartphone,WifiOff} from 'lucide-react'
import {OperatorSessionPanel} from './OperatorSessionPanel'
import {operatorFetch,type OperatorSession} from './operatorSession'
import './mobileFleet.css'

type MobileMiner={
  id:string;model:string;state:string;consentVerified:boolean;
  hardwareVerified:boolean;signedTelemetryFresh:boolean;
  hashrateTh:number|null;temperatureC:number|null;
  acceptedShares:number;verifiedShares:number
}
type FleetView={
  mode:'AUTHENTICATED_READ_ONLY';miningEnabled:false;
  verifiedHashrateTh:number;verifiedDevices:number;generatedAt:string;
  devices:MobileMiner[]
}

const decimal=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n)
const time=(s:string)=>Number.isFinite(Date.parse(s))?new Date(s).toLocaleTimeString():'Unknown'

export function MobileFleetApp(){
  const[session,setSession]=useState<OperatorSession|null>(null)
  const[data,setData]=useState<FleetView|null>(null)
  const[error,setError]=useState('')
  const[busy,setBusy]=useState(false)

  const load=useCallback(async()=>{
    if(!session)return
    setBusy(true)
    try{
      const response=await operatorFetch('/fleet/mobile')
      if(!response.ok)throw new Error(response.status===401?'Operator session expired':`Fleet status unavailable (HTTP ${response.status})`)
      const payload=await response.json() as FleetView
      if(payload.mode!=='AUTHENTICATED_READ_ONLY'||payload.miningEnabled!==false||
        !Array.isArray(payload.devices))throw new Error('Unexpected mining status response')
      setData(payload);setError('')
    }catch(e){setData(null);setError(e instanceof Error?e.message:'Fleet unavailable')}
    finally{setBusy(false)}
  },[session])

  useEffect(()=>{
    if(!session){setData(null);setError('');return}
    void load()
    const timer=setInterval(()=>void load(),15000)
    return ()=>clearInterval(timer)
  },[session,load])

  return <main className="mm-root">
    <div className="mm-content">
      <header className="mm-header">
        <a href="#/miner" className="mm-back"><ArrowLeft size={17}/> NEO Miner</a>
        <div className="mm-title"><Smartphone size={28}/><div><span>PROJECT 144 • NEO-MG-003</span><h1>Mobile Mining Command</h1></div></div>
        <p>Monitor authorized Bitcoin mining equipment from your phone. Hashing happens on independently enrolled hardware—not in this browser.</p>
      </header>

      <section className="mm-panel" aria-label="Secure operator sign in">
        <div className="mm-panelhead"><ShieldCheck size={20}/><b>Protected operator access</b></div>
        <OperatorSessionPanel onSession={setSession}/>
      </section>

      {session&&<>
        <section className="mm-hero" aria-label="Verified fleet status">
          <div className="mm-herohead"><span><Activity size={17}/> Verified fleet</span><button onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> {busy?'Checking…':'Refresh'}</button></div>
          <div className="mm-metrics">
            <div><small>Trusted hashrate</small><strong>{data?`${decimal(data.verifiedHashrateTh)} TH/s`:'Unavailable'}</strong></div>
            <div><small>Verified miners</small><strong>{data?data.verifiedDevices:'—'}</strong></div>
          </div>
          <p className="mm-status">{data?<><CheckCircle2 size={17}/> Read-only telemetry as of {time(data.generatedAt)}. Device hardware and consent verification are separate requirements.</>:<><WifiOff size={17}/> No verified live capacity can be displayed.</>}</p>
        </section>

        {error&&<div className="mm-warning" role="alert"><AlertTriangle size={19}/>{error}</div>}

        <section className="mm-panel">
          <div className="mm-panelhead"><Cpu size={19}/><b>Your operator-visible fleet</b></div>
          {!data?<p>Fleet data is unavailable until the secured Miner service is connected.</p>:
            data.devices.length===0?<p>No enrolled physical miners have been reported by the authorized service.</p>:
            <div className="mm-devices">{data.devices.map(device=><article key={device.id} className="mm-device">
              <div className="mm-devicehead"><div><b>{device.id}</b><small>{device.model}</small></div><span className={device.state==='VERIFIED_HASHING'?'mm-pill good':'mm-pill'}>{device.state.replaceAll('_',' ')}</span></div>
              <div className="mm-measures">
                <span>Verified power <b>{device.hashrateTh===null?'Not verified':`${decimal(device.hashrateTh)} TH/s`}</b></span>
                <span>Temperature <b>{device.temperatureC===null?'Not verified':`${decimal(device.temperatureC)} °C`}</b></span>
                <span>Accepted shares <b>{device.acceptedShares}</b></span>
                <span>Verified shares <b>{device.verifiedShares}</b></span>
              </div>
              <div className="mm-tags"><span>Device consent: {device.consentVerified?'Recorded':'Required'}</span><span>Hardware attestation: {device.hardwareVerified?'Recorded':'Required'}</span><span>Signed telemetry: {device.signedTelemetryFresh?'Fresh':'Unverified / stale'}</span></div>
            </article>)}</div>}
        </section>
      </>}

      <section className="mm-panel mm-guard">
        <div className="mm-panelhead"><ShieldCheck size={20}/><b>Mining controls are gated</b></div>
        <p>Phone access is read-only in this pilot. Device enrollments require cryptographic opt-in and separate physical attestation. Revocation is available through the secured operator workflow; there is no silent use of other people's devices.</p>
        <p>Actual Bitcoin mining, pool-accepted shares, payouts, and customer contract activation must be independently verified. This page never reports a guaranteed Bitcoin return.</p>
        <a href="#/miner-fleet">Open existing fleet administration →</a>
      </section>
    </div>
  </main>
}
