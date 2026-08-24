import {useEffect,useMemo,useState} from 'react'
import {Activity,ArrowDownUp,Bitcoin,Copy,RefreshCw,Search,ShieldCheck,WalletCards} from 'lucide-react'
import {getAddressBalances,getAddressTransactions,getAsset,getOrderMatches,getOrders,getUserOrders,isLikelyBitcoinAddress} from './counterpartyService'
import './neopay.css'

const DEFAULT_ADDRESS='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk'
const TREASURY_ADDRESS='18FyntJG9hdXYvanm67mGgbyo1P7adckvg'
const NOMNI_ICON='https://coindaddy.io/content/images/icons/xcp/NOMNI.png'

type Tab='dashboard'|'wallet'|'balances'|'transactions'|'neoscan'|'exchange'|'orders'|'trades'|'dispensers'|'economics'|'assets'|'settings'

function rows(v:any){return Array.isArray(v)?v:(v?.result??[])}
function qty(v:any){const n=Number(v??0);return Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:8}):'—'}
function short(v:string){return v&&v.length>18?`${v.slice(0,8)}…${v.slice(-8)}`:v||'—'}

export function NEOpayApp(){
 const[tab,setTab]=useState<Tab>('dashboard')
 const[address,setAddress]=useState(DEFAULT_ADDRESS)
 const[balances,setBalances]=useState<any[]>([])
 const[transactions,setTransactions]=useState<any[]>([])
 const[asset,setAsset]=useState<any>(null)
 const[orders,setOrders]=useState<any[]>([])
 const[userOrders,setUserOrders]=useState<any[]>([])
 const[trades,setTrades]=useState<any[]>([])
 const[error,setError]=useState('')
 const[loading,setLoading]=useState(false)
 const[lastUpdated,setLastUpdated]=useState<string>('Never')

 const refresh=async()=>{
   if(!isLikelyBitcoinAddress(address)){setError('Enter a valid Bitcoin/Counterparty address.');return}
   setLoading(true);setError('')
   const results=await Promise.allSettled([
     getAddressBalances(address),getAddressTransactions(address),getAsset('NOMNI'),getOrders(),getUserOrders(address),getOrderMatches()
   ])
   const [b,t,a,o,u,m]=results
   if(b.status==='fulfilled')setBalances(rows(b.value)); else setBalances([])
   if(t.status==='fulfilled')setTransactions(rows(t.value)); else setTransactions([])
   if(a.status==='fulfilled')setAsset(a.value?.result??a.value); else setAsset(null)
   if(o.status==='fulfilled')setOrders(o.value); else setOrders([])
   if(u.status==='fulfilled')setUserOrders(rows(u.value)); else setUserOrders([])
   if(m.status==='fulfilled')setTrades(m.value); else setTrades([])
   const failures=results.filter(r=>r.status==='rejected')
   if(failures.length) setError(`Some Counterparty data is unavailable (${failures.length}/6 requests). Retry or view API status in Settings.`)
   setLastUpdated(new Date().toLocaleTimeString())
   setLoading(false)
 }
 useEffect(()=>{void refresh()},[])

 const nomni=balances.find(b=>String(b.asset).toUpperCase()==='NOMNI')
 const xcp=balances.find(b=>String(b.asset).toUpperCase()==='XCP')
 const parsedOrders=useMemo(()=>orders.map(o=>{
   const give=String(o.give_asset||'').toUpperCase();const get=String(o.get_asset||'').toUpperCase()
   const giveQ=Number(o.give_remaining??o.give_quantity??0);const getQ=Number(o.get_remaining??o.get_quantity??0)
   if(give==='NOMNI'&&get==='XCP') return {...o,side:'ask',price:giveQ?getQ/giveQ:0,nomni:giveQ,xcp:getQ}
   if(give==='XCP'&&get==='NOMNI') return {...o,side:'bid',price:getQ?giveQ/getQ:0,nomni:getQ,xcp:giveQ}
   return null
 }).filter(Boolean) as any[],[orders])
 const asks=parsedOrders.filter(o=>o.side==='ask').sort((a,b)=>a.price-b.price)
 const bids=parsedOrders.filter(o=>o.side==='bid').sort((a,b)=>b.price-a.price)
 const bestAsk=asks[0]?.price
 const bestBid=bids[0]?.price
 const spread=Number.isFinite(bestAsk)&&Number.isFinite(bestBid)?bestAsk-bestBid:null

 const nav:[Tab,string][]=[['dashboard','Dashboard'],['wallet','Wallet'],['balances','Balances'],['transactions','Transactions'],['neoscan','NEOSCAN'],['exchange','Exchange'],['orders','My Orders'],['trades','Trades'],['dispensers','Dispensers'],['economics','Economics'],['assets','Assets'],['settings','Settings']]
 return <div className="np-shell">
   <aside className="np-side"><div className="np-brand"><div className="np-logo">N</div><div><b>NEOpay</b><span>NOMNI Wallet • W.O.M.E. Digital Ledger</span></div></div><nav>{nav.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav><div className="np-safe"><ShieldCheck size={16}/>Non-custodial. Never enter a private key or seed phrase.</div></aside>
   <main className="np-main"><header className="np-header"><div><p>WORLD OPEN MARKET EXCHANGE</p><h1>NEOpay</h1></div><div className="np-actions"><button onClick={()=>navigator.clipboard?.writeText(address)}><Copy size={15}/>Copy</button><button onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/>Refresh</button></div></header>
   {error&&<div className="np-error"><b>Counterparty data notice</b><span>{error}</span><button onClick={()=>void refresh()}>Retry</button></div>}
   {tab==='dashboard'&&<><section className="np-stats"><Card label="NOMNI Balance" value={qty(nomni?.quantity)} sub="On-chain address balance"/><Card label="XCP Balance" value={qty(xcp?.quantity)} sub="On-chain address balance"/><Card label="BTC Balance" value="Data unavailable" sub="Bitcoin balance provider not connected"/><Card label="NOMNI Supply" value={asset?qty(asset.supply??asset.quantity):'Data unavailable'} sub="Counterparty asset metadata"/></section><section className="np-grid"><Panel title="Latest Transactions"><TxTable items={transactions.slice(0,8)}/></Panel><Panel title="NOMNI / XCP Market"><div className="np-market"><Metric label="Best Bid" value={bestBid?`${bestBid.toFixed(8)} XCP`:'Data unavailable'}/><Metric label="Best Ask" value={bestAsk?`${bestAsk.toFixed(8)} XCP`:'Data unavailable'}/><Metric label="Spread" value={spread!==null?spread.toFixed(8):'Data unavailable'}/><Metric label="Open Orders" value={String(parsedOrders.length)}/></div></Panel></section></>}
   {tab==='wallet'&&<Panel title="Wallet / Address"><label className="np-label">Counterparty / Bitcoin address</label><div className="np-inputrow"><input value={address} onChange={e=>setAddress(e.target.value.trim())}/><button onClick={()=>void refresh()}><Search size={16}/>Load</button></div><p className="np-muted">Connected in watch-only mode. Transaction signing is not connected.</p><div className="np-address"><WalletCards size={18}/>{address}</div></Panel>}
   {tab==='balances'&&<Panel title="Balances"><div className="np-tablewrap"><table><thead><tr><th>Asset</th><th>Quantity</th><th>Type</th><th>Issuer</th><th>Estimated Value</th></tr></thead><tbody>{balances.length?balances.map((b,i)=><tr key={`${b.asset}-${i}`}><td>{String(b.asset).toUpperCase()==='NOMNI'&&<img className="np-coin" src={NOMNI_ICON}/>} {b.asset}</td><td>{qty(b.quantity)}</td><td>{b.asset_type??'Counterparty asset'}</td><td>{short(b.issuer)}</td><td>Data unavailable</td></tr>):<tr><td colSpan={5}>No balance data available.</td></tr>}</tbody></table></div></Panel>}
   {tab==='transactions'&&<Panel title="Transaction History"><TxTable items={transactions}/></Panel>}
   {tab==='neoscan'&&<Panel title="NEOSCAN"><p className="np-muted">Explorer foundation: address and NOMNI asset views use live Counterparty data where available.</p><div className="np-scan"><Metric label="Address" value={short(address)}/><Metric label="NOMNI issuer" value={short(asset?.issuer)}/><Metric label="NOMNI supply" value={asset?qty(asset.supply??asset.quantity):'Data unavailable'}/><Metric label="Treasury" value={short(TREASURY_ADDRESS)}/></div></Panel>}
   {tab==='exchange'&&<><section className="np-stats"><Card label="Market" value="NOMNI / XCP" sub="Counterparty DEX"/><Card label="Best Bid" value={bestBid?bestBid.toFixed(8):'Data unavailable'} sub="XCP per NOMNI"/><Card label="Best Ask" value={bestAsk?bestAsk.toFixed(8):'Data unavailable'} sub="XCP per NOMNI"/><Card label="Spread" value={spread!==null?spread.toFixed(8):'Data unavailable'} sub="Ask minus bid"/></section><section className="np-grid"><OrderBook title="Sell Orders" items={asks}/><OrderBook title="Buy Orders" items={bids}/></section><Panel title="Place Order — Review Mode"><div className="np-tradeform"><input placeholder="NOMNI amount" inputMode="decimal"/><input placeholder="Price in XCP" inputMode="decimal"/><button onClick={()=>alert('Transaction signing is not yet connected. No order was broadcast.')}>Review Order</button></div><p className="np-muted">NEOpay will not broadcast until a compatible user-controlled signer is connected.</p></Panel></>}
   {tab==='orders'&&<Panel title="My Orders"><OrderRows items={userOrders}/></Panel>}
   {tab==='trades'&&<Panel title="Recent Trades"><div className="np-tablewrap"><table><thead><tr><th>Time</th><th>Forward</th><th>Backward</th><th>Status</th><th>Transaction</th></tr></thead><tbody>{trades.length?trades.map((t,i)=><tr key={i}><td>{t.block_time??t.block_index??'—'}</td><td>{t.forward_asset} {qty(t.forward_quantity)}</td><td>{t.backward_asset} {qty(t.backward_quantity)}</td><td>{t.status??'—'}</td><td>{short(t.tx0_hash??t.id)}</td></tr>):<tr><td colSpan={5}>Trade data unavailable.</td></tr>}</tbody></table></div></Panel>}
   {tab==='dispensers'&&<Panel title="Dispensers"><p className="np-muted">NOMNI dispenser explorer is staged next. Create/Close execution remains disabled until secure signing is connected.</p></Panel>}
   {tab==='economics'&&<><section className="np-stats"><Card label="Total NOMNI Supply" value={asset?qty(asset.supply??asset.quantity):'Data unavailable'} sub="On-chain metadata"/><Card label="Treasury Address" value={short(TREASURY_ADDRESS)} sub="Configured reference"/><Card label="Holder Count" value="Data unavailable" sub="Indexer not connected"/><Card label="Market Activity" value={`${parsedOrders.length} open orders`} sub="Calculated from fetched orders"/></section><Panel title="NOMNI Supply Over Time"><p>Live Supply Over Time shows how the recorded NOMNI token supply changes across blockchain history. It is derived from Counterparty ledger data and should update as new blockchain data becomes available.</p><div className="np-placeholder">Historical supply data unavailable</div></Panel></>}
   {tab==='assets'&&<Panel title="NOMNI Asset"><div className="np-asset"><img src={NOMNI_ICON}/><div><h2>NOMNI</h2><p>{asset?.description||'Data unavailable'}</p></div></div><div className="np-scan"><Metric label="Issuer" value={short(asset?.issuer)}/><Metric label="Supply" value={asset?qty(asset.supply??asset.quantity):'Data unavailable'}/><Metric label="Divisible" value={asset?.divisible===undefined?'Data unavailable':String(asset.divisible)}/><Metric label="Treasury" value={short(TREASURY_ADDRESS)}/></div></Panel>}
   {tab==='settings'&&<Panel title="Settings / API Status"><div className="np-scan"><Metric label="Counterparty API" value={error?'DEGRADED':'ONLINE'}/><Metric label="NEOpay Frontend" value="ONLINE"/><Metric label="Signing" value="NOT CONNECTED"/><Metric label="Last successful refresh" value={lastUpdated}/></div><p className="np-muted">Default refresh cadence: manual for GitHub build. Automatic 30-second refresh will be enabled after API load testing.</p></Panel>}
   </main>
 </div>
}

function Card({label,value,sub}:{label:string,value:string,sub:string}){return <div className="np-card"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function Panel({title,children}:{title:string,children:any}){return <section className="np-panel"><div className="np-paneltitle"><Activity size={17}/><b>{title}</b></div>{children}</section>}
function Metric({label,value}:{label:string,value:string}){return <div className="np-metric"><span>{label}</span><b>{value}</b></div>}
function TxTable({items}:{items:any[]}){return <div className="np-tablewrap"><table><thead><tr><th>Type</th><th>Source</th><th>Destination</th><th>Block</th><th>Transaction</th><th>Validity</th></tr></thead><tbody>{items.length?items.map((t,i)=><tr key={t.tx_hash||i}><td>{t.type||t.transaction_type||t.event||'transaction'}</td><td>{short(t.source)}</td><td>{short(t.destination)}</td><td>{t.block_index??'—'}</td><td title={t.tx_hash}>{short(t.tx_hash)}</td><td>{t.valid??t.status??'—'}</td></tr>):<tr><td colSpan={6}>Transaction data unavailable.</td></tr>}</tbody></table></div>}
function OrderBook({title,items}:{title:string,items:any[]}){return <Panel title={title}><div className="np-tablewrap"><table><thead><tr><th>Price</th><th>NOMNI</th><th>XCP</th></tr></thead><tbody>{items.length?items.slice(0,20).map((o,i)=><tr key={o.tx_hash||i}><td>{o.price.toFixed(8)}</td><td>{qty(o.nomni)}</td><td>{qty(o.xcp)}</td></tr>):<tr><td colSpan={3}>Order data unavailable.</td></tr>}</tbody></table></div></Panel>}
function OrderRows({items}:{items:any[]}){return <div className="np-tablewrap"><table><thead><tr><th>Give</th><th>Get</th><th>Status</th><th>Transaction</th></tr></thead><tbody>{items.length?items.map((o,i)=><tr key={o.tx_hash||i}><td>{o.give_asset} {qty(o.give_quantity)}</td><td>{o.get_asset} {qty(o.get_quantity)}</td><td>{o.status??'—'}</td><td>{short(o.tx_hash)}</td></tr>):<tr><td colSpan={4}>No order data available.</td></tr>}</tbody></table></div>}
