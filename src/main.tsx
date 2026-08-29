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
import { SettlementReceiptsApp } from './miner/SettlementReceiptsApp'
import { TreasuryControlApp } from './miner/TreasuryControlApp'
import { BitcoinPayoutAdapterApp } from './miner/BitcoinPayoutAdapterApp'
import { PersistenceAuditApp } from './miner/PersistenceAuditApp'
import { StorefrontApp } from './miner/StorefrontApp'
import { NeoWireApp } from './wire/NeoWireApp'
import { NeoExplorer } from './explorer/NeoExplorer'
import { NeoFxApp } from './neofx/NeoFxApp'
import { NEOpayWallet } from './neopay/NEOpayWallet'
import { NEOpaySecurityOverlay } from './neopay/NEOpaySecurityOverlay'
import { NEOpayContactCenter } from './neopay/NEOpayContactCenter'
import { NativeBitcoinSendOverlay } from './neopay/NativeBitcoinSendOverlay'
import { WalletConnectionCenter } from './neopay/WalletConnectionCenter'
import { TellerDashboard } from './teller/TellerDashboard'
import { NeoCheckoutLauncher } from './checkout/NeoCheckoutLauncher'
import './styles.css'
import './home/home.css'
import './explorer/explorer.css'
import './neofx/neofx.css'

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

function CheckoutShell({serviceId,serviceName,children}:{serviceId:string;serviceName:string;children:React.ReactNode}){
 return <><div style={{padding:'0 18px'}}><NeoCheckoutLauncher serviceId={serviceId} serviceName={serviceName}/></div>{children}</>
}

function RootRouter(){
  const[route,setRoute]=useState(resolveRoute)
  useEffect(()=>{const sync=()=>setRoute(resolveRoute());window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}},[])
  const base=(import.meta.env.BASE_URL||'/').replace(/\/$/,'')
  const governmentBase=(import.meta.env.VITE_NEO_GOVERNMENT_URL||'https://neo-government.neosystem.workers.dev').replace(/\/$/,'')
  const publicRoute=(name:string)=>`${base}/${name}/`
  const open=(section:string)=>{if(['overview','treasury','tribunal','security','router'].includes(section)){window.location.assign(`${governmentBase}/command?module=${encodeURIComponent(section)}`);return}if(section==='cfo'||section==='books'){window.location.assign(publicRoute('neo-books'));return}if(section==='corpus'){window.location.assign(publicRoute('neo-corpus'));return}window.location.hash=`/${section}`}

  const normalized=route.replace(/\/$/,'')||'/'
  const isHome=normalized==='/'||normalized==='/home'
  const isCommand=normalized==='/command'||normalized.startsWith('/command/')
  const isPrime=normalized==='/neo-prime'||normalized==='/prime'
  const isGenerator=normalized==='/generator'||normalized==='/neo-generator'||normalized.startsWith('/generator/')||normalized.startsWith('/neo-generator/')
  const isProduction=normalized==='/generator-production'||normalized.startsWith('/generator-production/')
  const isCloudMining=normalized==='/cloud-mining'||normalized.startsWith('/cloud-mining/')
  const isInfrastructure=normalized==='/infrastructure-onboarding'||normalized.startsWith('/infrastructure-onboarding/')
  const isFleet=normalized==='/miner-fleet'||normalized.startsWith('/miner-fleet/')
  const isHashVault=normalized==='/hashvault'||normalized.startsWith('/hashvault/')
  const isReceipts=normalized==='/settlement-receipts'||normalized.startsWith('/settlement-receipts/')
  const isTreasury=normalized==='/miner-treasury'||normalized.startsWith('/miner-treasury/')
  const isBitcoinPayout=normalized==='/bitcoin-payout'||normalized.startsWith('/bitcoin-payout/')
  const isPersistenceAudit=normalized==='/persistence-audit'||normalized.startsWith('/persistence-audit/')
  const isMiner=normalized==='/miner'||normalized==='/neo-miner'||normalized.startsWith('/miner/')||normalized.startsWith('/neo-miner/')
  const isMinerStore=normalized==='/miner-store'||normalized.startsWith('/miner-store/')
  const isWire=normalized==='/wire'||normalized.startsWith('/wire/')
  const isExplorer=normalized==='/explorer'||normalized.startsWith('/explorer/')
  const isNeoFx=normalized==='/neofx'||normalized.startsWith('/neofx/')
  const isNEOpay=normalized==='/neopay'||normalized.startsWith('/neopay/')
  const isTeller=normalized==='/teller'||normalized.startsWith('/teller/')
  const bankHref=`${base}/neopay/ces.html`

  useEffect(()=>{if(isCommand) window.location.replace(`${governmentBase}/command`)},[isCommand,governmentBase])
  if(isCommand) return <main style={{padding:24,color:'#d9ffe3',background:'#010503',minHeight:'100vh'}}>Opening authenticated NEO Government Control Plane…</main>
  if(isPrime) return <CheckoutShell serviceId="neo-prime" serviceName="NEO Prime"><HomeBase onOpen={open}/></CheckoutShell>
  if(isHome) return <HomeBase onOpen={open}/>
  if(isTeller) return <TellerDashboard/>
  if(isNEOpay) return <CheckoutShell serviceId="neopay" serviceName="NEOpay"><div className="neopay-route"><NEOpayWallet/><WalletConnectionCenter/><NEOpaySecurityOverlay/><NEOpayContactCenter/><NativeBitcoinSendOverlay/><a className="neopay-trader-launch" href={bankHref}>∞ NEO Bank</a></div></CheckoutShell>
  if(isNeoFx) return <NeoFxApp/>
  if(isExplorer) return <NeoExplorer/>
  if(isWire) return <NeoWireApp/>
  if(isMinerStore) return <CheckoutShell serviceId="neo-miner" serviceName="NEO Miner"><StorefrontApp/></CheckoutShell>
  if(isProduction) return <ProductionStatusApp/>
  if(isInfrastructure) return <InfrastructureOnboardingApp/>
  if(isFleet) return <FleetEnrollmentApp/>
  if(isHashVault) return <HashVaultApp/>
  if(isReceipts) return <SettlementReceiptsApp/>
  if(isTreasury) return <TreasuryControlApp/>
  if(isBitcoinPayout) return <BitcoinPayoutAdapterApp/>
  if(isPersistenceAudit) return <PersistenceAuditApp/>
  if(isCloudMining) return <CheckoutShell serviceId="neo-miner" serviceName="NEO Miner"><CloudMiningOperationsApp/></CheckoutShell>
  if(isGenerator) return <CheckoutShell serviceId="neo-generator" serviceName="NEO Generator"><GeneratorApp/></CheckoutShell>
  if(isMiner) return <CheckoutShell serviceId="neo-miner" serviceName="NEO Miner"><MinerApp/></CheckoutShell>
  return <HomeBase onOpen={open}/>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><RootRouter/></React.StrictMode>)
