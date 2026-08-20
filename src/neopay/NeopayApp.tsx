import {useEffect,useMemo,useState} from 'react'
import {Activity,BarChart3,BookOpen,RefreshCw,Search,ShieldCheck,WalletCards} from 'lucide-react'
import {
  displayAsset,getAddressBalances,getAddressTransactions,getAsset,getOrders,getUserOrders,
  NOMNI_ASSET,NOMNI_ICON,NOMNI_TREASURY,
  type AssetInfo,type Balance,type CounterpartyTx,type Order
} from './counterparty'
import './neopay.css'

type Tab='dashboard'|'balances'|'history'|'exchange'|'economics'

const fmt=(value:unknown)=>{
  const n=Number(value)
  return Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n):String(value??'—')
}
const short=(value?:string)=>value?`${value.slice(0,8)}…${value.slice(-6)}`:'—'

export function NeopayApp(){
  const[tab,setTab]=useState<Tab>('dashboard')
  const[address,setAddress]=useState(NOMNI_TREASURY)
  const[activeAddress,setActiveAddress]=useState(NOMNI_TREASURY)
  const[balances,setBalances]=useState<Balance[]>([])
  const[txs,setTxs]=useState<CounterpartyTx[]>([])
  const[asset,setAsset]=useState<AssetInfo|null>(null)
  const[asks,setAsks]=useState<Order[]>([])
  const[bids,setBids]=useState<Order[]>([])
  const[userOrders,setUserOrders]=useState<Order[]>([])
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState('')
  const[review,setReview]=useState<{side:'BUY'|'SELL';amount:string;price:string}|null>(null)
  const[side,setSide]=useState<'BUY'|'SELL'>('BUY')
  const[amount,setAmount]=useState('')
  const[price,setPrice]=useState('')

  const refresh=async(nextAddress=activeAddress)=>{
    setLoading(true);setError('')
    const [b,t,a,ask,bid,u]=await Promise.allSettled([
      getAddressBalances(nextAddress),getAddressTransactions(nextAddress),getAsset(NOMNI_ASSET),
      getOrders('NOMNI','XCP'),getOrders('XCP','NOMNI'),getUserOrders(nextAddress)
    ])
    if(b.status==='fulfilled')setBalances(b.value); else setError('Unable to load one or more Counterparty data feeds.')
    if(t.status==='fulfilled')setTxs(t.value)
    if(a.status==='fulfilled')setAsset(a.value)
    if(ask.status==='fulfilled')setAsks(ask.value)
    if(bid.status==='fulfilled')setBids(bid.value)
    if(u.status==='fulfilled')setUserOrders(u.value)
    setLoading(false)
  }

  useEffect(()=>{void refresh()},[])

  const nomniBalance=useMemo(()=>balances.find(b=>b.asset==='NOMNI'),[balances])
  const xcpBalance=useMemo(()=>balances.find(b=>b.asset==='XCP'),[balances])
  const activeOrders=useMemo(()=>userOrders.filter(o=>!o.status||o.status==='open'),[userOrders])

  const orderRows=(orders:Order[],kind:'ask'|'bid')=>orders.map(o=>{
    const give=Number(o.give_quantity||0),get=Number(o.get_quantity||0)
    const p=kind==='ask'?(give?get/give:0):(get?give/get:0)
    return {...o,price:p}
  }).filter(o=>Number.isFinite(o.price)&&o.price>0).sort((a,b)=>kind==='ask'?a.price-b.price:b.price-a.price)
  const askRows=orderRows(asks,'ask'),bidRows=orderRows(bids,'bid')
  const bestAsk=askRows[0]?.price
  const bestBid=bidRows[0]?.price
  const spread=bestAsk&&bestBid?bestAsk-bestBid:undefined

  const selectAddress=()=>{
    const value=address.trim()
    if(!/^[13bc][a-zA-Z0-9]{20,80}$/.test(value)){setError('Enter a valid Bitcoin/Counterparty address.');return}
    setActiveAddress(value);void refresh(value)
  }

  return <div className="neopay">
    <section className="npHero">
      <div className="npIdentity"><img src={NOMNI_ICON} alt="NOMNI"/><div><span>NEOPAY</span><h2>NOMNI Wallet • W.O.M.E. Digital Ledger</h2><p>Read-only Counterparty terminal. XCP is displayed as NEO (XCP); the on-chain asset remains XCP.</p></div></div>
      <button className="npRefresh" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={17}/>{loading?'Refreshing…':'Refresh'}</button>
    </section>

    <section className="npAddress card">
      <div><label>Active Counterparty address</label><div className="npSearch"><input value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>e.key==='Enter'&&selectAddress()}/><button onClick={selectAddress}><Search size={16}/>Load</button></div></div>
      <div className="npTreasury"><span>Treasury</span><b>{short(NOMNI_TREASURY)}</b></div>
    </section>

    {error&&<div className="npError">{error}</div>}

    <nav className="npTabs">
      {([['dashboard','Dashboard'],['balances','Balances'],['history','Transactions'],['exchange','Exchange'],['economics','Economics']] as [Tab,string][]).map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}
    </nav>

    {tab==='dashboard'&&<>
      <section className="npStats">
        <article className="card"><WalletCards/><span>NOMNI Balance</span><strong>{fmt(nomniBalance?.quantity||0)}</strong><small>{short(activeAddress)}</small></article>
        <article className="card"><Activity/><span>NEO (XCP) Balance</span><strong>{fmt(xcpBalance?.quantity||0)}</strong><small>Counterparty protocol asset</small></article>
        <article className="card"><BookOpen/><span>Transactions</span><strong>{txs.length.toLocaleString()}</strong><small>Current API page</small></article>
        <article className="card"><BarChart3/><span>Open Orders</span><strong>{activeOrders.length.toLocaleString()}</strong><small>Address order activity</small></article>
      </section>
      <section className="npGrid">
        <article className="card npPanel"><h3>NOMNI</h3><div className="npAsset"><img src={NOMNI_ICON} alt="NOMNI"/><div><b>{fmt(asset?.supply??'Data unavailable')}</b><span>Total recorded supply</span></div></div><p><b>Issuer:</b> {String(asset?.issuer??'Data unavailable')}</p><p><b>Divisible:</b> {asset?.divisible===undefined?'Data unavailable':asset.divisible?'Yes':'No'}</p><p><b>Description:</b> {String(asset?.description??'Data unavailable')}</p></article>
        <article className="card npPanel"><h3>Recent Activity</h3><div className="npFeed">{txs.slice(0,6).map(tx=><div key={tx.tx_hash}><span>{tx.transaction_type||'transaction'}</span><b>{short(tx.tx_hash)}</b><small>{tx.block_index?`Block ${tx.block_index}`:'Pending metadata'}</small></div>)}</div></article>
      </section>
    </>}

    {tab==='balances'&&<section className="card npPanel"><div className="npTitle"><div><h3>Address Balances</h3><p>{activeAddress}</p></div><WalletCards/></div><div className="npTable"><table><thead><tr><th>Asset</th><th>Display</th><th>Quantity</th></tr></thead><tbody>{balances.map(b=><tr key={b.asset}><td className="mono">{b.asset}</td><td>{displayAsset(b.asset)}</td><td>{fmt(b.quantity)}</td></tr>)}</tbody></table></div></section>}

    {tab==='history'&&<section className="card npPanel"><div className="npTitle"><div><h3>Transaction History</h3><p>Readable Counterparty activity for the active address</p></div><BookOpen/></div><div className="npTable"><table><thead><tr><th>Time</th><th>Type</th><th>Source</th><th>Destination</th><th>Block</th><th>TX</th></tr></thead><tbody>{txs.map(tx=><tr key={tx.tx_hash}><td>{tx.block_time?new Date(tx.block_time*1000).toLocaleString():'—'}</td><td>{tx.transaction_type||'—'}</td><td className="mono">{short(tx.source)}</td><td className="mono">{short(tx.destination||undefined)}</td><td>{tx.block_index??'—'}</td><td className="mono">{short(tx.tx_hash)}</td></tr>)}</tbody></table></div></section>}

    {tab==='exchange'&&<>
      <section className="npStats market">
        <article className="card"><span>Market</span><strong>NOMNI / NEO</strong><small>On-chain quote asset: XCP</small></article>
        <article className="card"><span>Best Bid</span><strong>{bestBid?fmt(bestBid):'—'}</strong><small>XCP per NOMNI</small></article>
        <article className="card"><span>Best Ask</span><strong>{bestAsk?fmt(bestAsk):'—'}</strong><small>XCP per NOMNI</small></article>
        <article className="card"><span>Spread</span><strong>{spread!==undefined?fmt(spread):'—'}</strong><small>Ask minus bid</small></article>
      </section>
      <section className="npGrid exchange">
        <article className="card npPanel"><h3>Order Book</h3><div className="npBook"><div><h4>Bids</h4>{bidRows.slice(0,12).map((o,i)=><button key={`${o.tx_hash}-${i}`} onClick={()=>{setSide('BUY');setPrice(String(o.price))}}><span>{fmt(o.price)}</span><b>{fmt(o.get_remaining??o.get_quantity)}</b></button>)}</div><div><h4>Asks</h4>{askRows.slice(0,12).map((o,i)=><button key={`${o.tx_hash}-${i}`} onClick={()=>{setSide('SELL');setPrice(String(o.price))}}><span>{fmt(o.price)}</span><b>{fmt(o.give_remaining??o.give_quantity)}</b></button>)}</div></div></article>
        <article className="card npPanel"><h3>Review Order</h3><div className="npSide"><button className={side==='BUY'?'active':''} onClick={()=>setSide('BUY')}>Buy NOMNI</button><button className={side==='SELL'?'active':''} onClick={()=>setSide('SELL')}>Sell NOMNI</button></div><label>Amount NOMNI</label><input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/><label>Price in NEO (XCP)</label><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00000000"/><div className="npTotal"><span>Estimated total</span><b>{fmt((Number(amount)||0)*(Number(price)||0))} XCP</b></div><button className="npReview" onClick={()=>setReview({side,amount,price})}>Review Order</button><p className="npSafe"><ShieldCheck size={14}/>Signing and broadcasting are intentionally disabled in this alpha.</p></article>
      </section>
      <section className="card npPanel"><h3>My Orders</h3><div className="npTable"><table><thead><tr><th>Status</th><th>Give</th><th>Get</th><th>Remaining</th><th>TX</th></tr></thead><tbody>{userOrders.slice(0,30).map((o,i)=><tr key={`${o.tx_hash}-${i}`}><td>{o.status||'—'}</td><td>{displayAsset(o.give_asset)} {fmt(o.give_quantity)}</td><td>{displayAsset(o.get_asset)} {fmt(o.get_quantity)}</td><td>{fmt(o.give_remaining??'—')}</td><td className="mono">{short(o.tx_hash)}</td></tr>)}</tbody></table></div></section>
      {review&&<div className="npModal" onClick={()=>setReview(null)}><div className="card" onClick={e=>e.stopPropagation()}><h3>Order Review</h3><p><b>Market:</b> NOMNI / NEO (XCP)</p><p><b>Side:</b> {review.side}</p><p><b>Amount:</b> {review.amount||'0'} NOMNI</p><p><b>Price:</b> {review.price||'0'} XCP</p><p><b>Total:</b> {fmt((Number(review.amount)||0)*(Number(review.price)||0))} XCP</p><div className="npWarning">Transaction signing is not yet connected. No blockchain transaction will be broadcast.</div><button onClick={()=>setReview(null)}>Close Review</button></div></div>}
    </>}

    {tab==='economics'&&<section className="npGrid economics"><article className="card npPanel"><h3>NOMNI Monetary Snapshot</h3><p><span>Total supply</span><b>{fmt(asset?.supply??'Data unavailable')}</b></p><p><span>Treasury balance</span><b>{fmt(nomniBalance?.quantity||0)} NOMNI</b></p><p><span>Known transactions</span><b>{txs.length}</b></p><p><span>Open address orders</span><b>{activeOrders.length}</b></p></article><article className="card npPanel"><h3>Supply Over Time</h3><div className="npSupply"><i/><strong>{fmt(asset?.supply??900000000)} NOMNI</strong><span>Current recorded supply</span></div><p className="npNote">Historical supply reconstruction requires indexed issuance/destruction history. NEOpay does not fabricate missing historical points.</p></article></section>}
  </div>
}
