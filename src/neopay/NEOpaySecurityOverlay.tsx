import{useEffect,useState}from'react'
import{ShieldCheck,X}from'lucide-react'
import{neoPaySigner,type SignerState}from'./signer'
import{SecuritySettings}from'./SecuritySettings'
import{loadSecurityPreferences,type SecurityPreferences}from'./walletSecurity'

function applyPrivacy(prefs:SecurityPreferences){document.documentElement.classList.toggle('neopay-privacy',prefs.privacyMode)}

export function NEOpaySecurityOverlay(){
 const[open,setOpen]=useState(false),[signer,setSigner]=useState<SignerState>(()=>neoPaySigner.state())
 useEffect(()=>{applyPrivacy(loadSecurityPreferences());const onSecurity=(e:Event)=>applyPrivacy((e as CustomEvent<SecurityPreferences>).detail||loadSecurityPreferences());window.addEventListener('neopay-security-change',onSecurity);const id=window.setInterval(()=>setSigner(neoPaySigner.state()),1000);return()=>{window.removeEventListener('neopay-security-change',onSecurity);window.clearInterval(id);document.documentElement.classList.remove('neopay-privacy')}},[])
 const connect=async()=>{try{setSigner(await neoPaySigner.connect())}catch(e:any){window.alert(e?.message||'Unable to connect signer.')}}
 const lock=async()=>{await neoPaySigner.lock();setSigner(neoPaySigner.state())}
 return <><button className="neopay-security-launch" onClick={()=>setOpen(true)}><ShieldCheck size={16}/>Security</button>{open&&<div className="neopay-security-backdrop" role="dialog" aria-modal="true" aria-label="NEOpay Security Center"><div className="neopay-security-sheet"><button className="neopay-security-close" onClick={()=>setOpen(false)} aria-label="Close security center"><X size={19}/></button><SecuritySettings signer={signer} onConnect={()=>void connect()} onLock={()=>void lock()}/></div></div>}</>
}
