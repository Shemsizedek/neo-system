/// <reference types="vite/client" />
import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { HomeBase } from './home/HomeBase'
import { MinerApp } from './miner/MinerApp'
import { GeneratorApp } from './miner/GeneratorApp'
import { StorefrontApp } from './miner/StorefrontApp'
import { NeoWireApp } from './wire/NeoWireApp'
import { NeoExplorer } from './explorer/NeoExplorer'
import { NEOpayWallet } from './neopay/NEOpayWallet'
import { TellerDashboard } from './teller/TellerDashboard'
import './styles.css'
import './home/home.css'
import './explorer/explorer.css'

function resolveRoute(){
  const hash=window.location.hash.replace(/^#/,'')
  if(hash.startsWith('/')) return hash

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
    return()=>{
      window.removeEventListener('hashchange',sync)
      window.removeEventListener('popstate',sync)
    }
  },[])

  const open=(section:string)=>{
    if(section==='overview'||['cfo','books','treasury','tribunal','corpus','security'].includes(section)) window.location.hash='/command'
    else window.location.hash=`/${section}`
  }

  const isHome=route==='/'||route===''||route==='/home'
  const isCommand=route==='/command'||route.startsWith('/command/')
  const isGenerator=route==='/generator'||route.startsWith('/generator/')
  const isMiner=route==='/miner'||route.startsWith('/miner/')
  const isMinerStore=route==='/miner-store'||route.startsWith('/miner-store/')
  const isWire=route==='/wire'||route.startsWith('/wire/')
  const isExplorer=route==='/explorer'||route.startsWith('/explorer/')
  const isNEOpay=route==='/neopay'||route.startsWith('/neopay/')
  const isTeller=route==='/teller'||route.startsWith('/teller/')
  const base=(import.meta.env.BASE_URL||'/').replace(/\/$/,'')
  const bankHref=`${base}/neopay/ces.html`

  if(isHome) return <HomeBase onOpen={open}/>
  if(isTeller) return <TellerDashboard/>
  if(isNEOpay) return <div className="neopay-route"><NEOpayWallet/><a className="neopay-trader-launch" href={bankHref}>∞ NEO Bank</a></div>
  if(isExplorer) return <NeoExplorer/>
  if(isWire) return <NeoWireApp/>
  if(isMinerStore) return <StorefrontApp/>
  if(isGenerator) return <GeneratorApp/>
  if(isMiner) return <MinerApp/>
  if(isCommand) return <App/>
  return <HomeBase onOpen={open}/>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RootRouter/></React.StrictMode>
)
