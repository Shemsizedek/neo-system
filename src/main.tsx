/// <reference types="vite/client" />
import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import { HomeBase } from './home/HomeBase'
import { MinerApp } from './miner/MinerApp'
import { GeneratorApp } from './miner/GeneratorApp'
import { ProductionStatusApp } from './miner/ProductionStatusApp'
import { CloudMiningOperationsApp } from './miner/CloudMiningOperationsApp'
import { InfrastructureOnboardingApp } from './miner/InfrastructureOnboardingApp'
import { FleetEnrollmentApp } from './miner/FleetEnrollmentApp'
import { HashVaultApp } from './miner/HashVaultApp'
import { StorefrontApp } from './miner/StorefrontApp'
import { NeoWireApp } from './wire/NeoWireApp'
import { NeoExplorer } from './explorer/NeoExplorer'
import { NEOpayWallet } from './neopay/NEOpayWallet'
import { NEOpaySecurityOverlay } from './neopay/NEOpaySecurityOverlay'
import { NEOpayContactCenter } from './neopay/NEOpayContactCenter'
import { NativeBitcoinSendOverlay } from './neopay/NativeBitcoinSendOverlay'
import { WalletConnectionCenter } from './neopay/WalletConnectionCenter'
import { TellerDashboard } from './teller/TellerDashboard'
import './styles.css'
import './home/home.css'
import './explorer/explorer.css'

function resolveRoute(){
  const hash=window.location.hash.replace(/^#/,'')
  if(hash.startsWith('/')) return hash
  const requested=new URLSearchParams(window.location.search).get('route')
  if(requested) return `/${requested.replace(/^\/+|\/+$/g,'')}`
  const base=(import.meta.env.BASE_URL||'/').replace(/\/$/,'')
  let path=window.location.pathname
  if(base && base!=='/' && path.startsWith(base)) path=path.slice(base.length)||'/'
  return path
}

function RootRouter(){
  const[route,setRoute]=useState(resolveRoute)
  useEffect(()=>{
    const sync=()=>setRoute(resolveRoute())
    window.addEventListener('hashchange',sync)
    window.addEventListener('popstate',sync)
    return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}
  },[])

  const base=(import.meta.env.BASE_URL||'/').replace(/\/$/,'')
  const governmentBase=(import.meta.env.VITE_NEO_GOVERNMENT_URL||'https://neo-government.neosystem.workers.dev').replace(/\/$/,'')
  const publicRoute=(name:string)=>`${base}/${name}/`
  const open=(section:string)=>{
    if(['overview','treasury','tribunal','security','router'].includes(section)){window.location.assign(`${governmentBase}/command?module=${encodeURIComponent(section)}`);return}
    if(section==='cfo'||section==='books'){window.location.assign(publicRoute('neo-books'));return}
    if(section==='corpus'){window.location.assign(publicRoute('neo-corpus'));return}
    window.location.hash=`/${section}`
  }

  const isHome=route==='/'||route===''||route==='/home'
  const isCommand=route==='/command'||route.startsWith('/command/')
  const isGenerator=route==='/generator'||route.startsWith('/generator/')
  const isProduction=route==='/generator-production'||route.startsWith('/generator-production/')
  const isCloudMining=route==='/cloud-mining'||route.startsWith('/cloud-mining/')
  const isInfrastructure=route==='/infrastructure-onboarding'||route.startsWith('/infrastructure-onboarding/')
  const isFleet=route==='/miner-fleet'||route.startsWith('/miner-fleet/')
  const isHashVault=route==='/hashvault'||route.startsWith('/hashvault/')
  const isMiner=route==='/miner'||route.startsWith('/miner/')
  const isMinerStore=route==='/miner-store'||route.startsWith('/miner-store/')
  const isWire=route==='/wire'||route.startsWith('/wire/')
  const isExplorer=route==='/explorer'||route.startsWith('/explorer/')
  const isNEOpay=route==='/neopay'||route.startsWith('/neopay/')
  const isTeller=route==='/teller'||route.startsWith('/teller/')
  const bankHref=`${base}/neopay/ces.html`

  useEffect(()=>{if(isCommand) window.location.replace(`${governmentBase}/command`)},[isCommand,governmentBase])
  if(isCommand) return <main style={{padding:24,color:'#d9ffe3',background:'#010503',minHeight:'100vh'}}>Opening authenticated NEO Government Control Plane…</main>
  if(isHome) return <HomeBase onOpen={open}/>
  if(isTeller) return <TellerDashboard/>
  if(isNEOpay) return <div className="neopay-route"><NEOpayWallet/><WalletConnectionCenter/><NEOpaySecurityOverlay/><NEOpayContactCenter/><NativeBitcoinSendOverlay/><a className="neopay-trader-launch" href={bankHref}>∞ NEO Bank</a></div>
  if(isExplorer) return <NeoExplorer/>
  if(isWire) return <NeoWireApp/>
  if(isMinerStore) return <StorefrontApp/>
  if(isProduction) return <ProductionStatusApp/>
  if(isInfrastructure) return <InfrastructureOnboardingApp/>
  if(isFleet) return <FleetEnrollmentApp/>
  if(isHashVault) return <HashVaultApp/>
  if(isCloudMining) return <CloudMiningOperationsApp/>
  if(isGenerator) return <GeneratorApp/>
  if(isMiner) return <MinerApp/>
  return <HomeBase onOpen={open}/>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><RootRouter/></React.StrictMode>)
