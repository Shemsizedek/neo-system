import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { MinerApp } from './miner/MinerApp'
import './styles.css'

const isMiner = window.location.pathname === '/miner' || window.location.pathname.startsWith('/miner/')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isMiner ? <MinerApp/> : <App/>}</React.StrictMode>
)
