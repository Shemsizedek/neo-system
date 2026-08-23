/// <reference types="vite/client" />
import React,{useEffect,useState} from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { HomeBase } from './home/HomeBase'
import { MinerApp } from './miner/MinerApp'
import { NeoWireApp } from './wire/NeoWireApp'
import { NeoExplorer } from './explorer/NeoExplorer'
import './styles.css'
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
    if(section==='overview') window.location.hash='/command'
    else if(['cfo','books','treasury','tribunal','corpus','security'].includes(section)) window.location.hash=`/command/${section}`
    else window.location.hash=`/${section}`
  }

  const isHome=route==='/'||route===''||route==='/home'
  const isCommand=route==='/command'||route.startsWith('/command/')
  const isMiner=route==='/miner'||route.startsWith('/miner/')
  const isWire=route==='/wire'||route.startsWith('/wire/')
  const isExplorer=route==='/explorer'||route.startsWith('/explorer/')

  if(isHome) return <HomeBase onOpen={open}/>
  if(isExplorer) return <NeoExplorer/>
  if(isWire) return <NeoWireApp/>
  if(isMiner) return <MinerApp/>
  if(isCommand) return <App/>
  return <HomeBase onOpen={open}/>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RootRouter/></React.StrictMode>
)
