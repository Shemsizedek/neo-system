import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { MinerApp } from './miner/MinerApp'
import { NeoWireApp } from './wire/NeoWireApp'
import './styles.css'

const path=window.location.pathname
const isMiner=path==='/miner'||path.startsWith('/miner/')
const isWire=path==='/wire'||path.startsWith('/wire/')||window.location.hash.startsWith('#/wire')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isWire?<NeoWireApp/>:isMiner?<MinerApp/>:<App/>}</React.StrictMode>
)
