import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { MinerApp } from './miner/MinerApp'
import { NeoWireApp } from './wire/NeoWireApp'
import { NeoExplorer } from './explorer/NeoExplorer'
import './styles.css'
import './explorer/explorer.css'

const path=window.location.pathname
const isMiner=path==='/miner'||path.startsWith('/miner/')
const isWire=path==='/wire'||path.startsWith('/wire/')||window.location.hash.startsWith('#/wire')
const isExplorer=path==='/explorer'||path.startsWith('/explorer/')||window.location.hash.startsWith('#/explorer')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isExplorer?<NeoExplorer/>:isWire?<NeoWireApp/>:isMiner?<MinerApp/>:<App/>}</React.StrictMode>
)
