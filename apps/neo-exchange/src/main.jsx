import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BarChart3, Bitcoin, BookOpen, BriefcaseBusiness, CandlestickChart, CircleDollarSign, Gauge, Layers3, ListFilter, Search, ShieldCheck, Star, WalletCards } from 'lucide-react';
import './styles.css';

const FOUNDATION_ADDRESS = '1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8';
const TREASURY_ADDRESS = '18FyntJG9hdXYvanm67mGgbyo1P7adckvg';
const API_BASE = window.NEO_EXCHANGE_API_BASE || '';

const sampleMarkets = [
  { pair: 'BTC/XCP', last: '—', change: 'LIVE FEED REQUIRED', bid: '—', ask: '—' },
  { pair: 'NOMNI/XCP', last: '—', change: 'ON-CHAIN ASSET', bid: '—', ask: '—' },
  { pair: 'NOMNI/BTC', last: '—', change: 'ON-CHAIN ASSET', bid: '—', ask: '—' },
  { pair: 'NEOCASH/XCP', last: '—', change: 'ON-CHAIN ASSET', bid: '—', ask: '—' }
];

function App() {
  const [activePair, setActivePair] = useState('BTC/XCP');
  const [side, setSide] = useState('BUY');
  const [orderType, setOrderType] = useState('LIMIT');
  const [assets, setAssets] = useState([]);
  const [feedState, setFeedState] = useState('REFERENCE');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/neo-exchange/assets?addresses=${TREASURY_ADDRESS},${FOUNDATION_ADDRESS}`)
      .then((r) => { if (!r.ok) throw new Error('feed'); return r.json(); })
      .then((d) => { setAssets(d.assets || []); setFeedState(d.status || 'LIVE'); })
      .catch(() => setFeedState('REFERENCE'));
  }, []);

  const visibleAssets = useMemo(() => {
    const q = search.trim().toUpperCase();
    return assets.filter(a => !q || a.asset?.includes(q)).slice(0, 12);
  }, [assets, search]);

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">N</div><div><strong>NEO EXCHANGE</strong><span>BITCOIN / COUNTERPARTY XCP</span></div></div>
      <div className="symbol-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Symbol, asset, address or market"/></div>
      <div className="top-status"><span className="status-dot"/><b>{feedState}</b><small>ORIGIN TERMINAL</small></div>
    </header>

    <aside className="sidebar">
      {[[CandlestickChart,'Trade'],[BarChart3,'Markets'],[Layers3,'Assets'],[WalletCards,'Wallet'],[BriefcaseBusiness,'Portfolio'],[BookOpen,'Orders'],[Activity,'History'],[Gauge,'Analytics'],[ShieldCheck,'Security']].map(([Icon,label]) => <button className={label==='Trade'?'active':''} key={label}><Icon size={17}/><span>{label}</span></button>)}
    </aside>

    <main className="workspace">
      <section className="market-strip">
        {sampleMarkets.map(m => <button key={m.pair} onClick={()=>setActivePair(m.pair)} className={activePair===m.pair?'selected':''}><span>{m.pair}</span><strong>{m.last}</strong><small>{m.change}</small></button>)}
      </section>

      <section className="terminal-grid">
        <div className="panel chart-panel">
          <div className="panel-header"><div><small>MARKET</small><h1>{activePair}</h1></div><div className="quote"><b>—</b><span>verified market feed pending</span></div></div>
          <div className="toolbar"><button>1m</button><button>5m</button><button>15m</button><button>1H</button><button className="active">4H</button><button>1D</button><i/><button>Indicators</button><button>Objects</button></div>
          <div className="chart-stage">
            <div className="chart-watermark"><CandlestickChart size={50}/><b>NEO EXCHANGE</b><span>Live OHLC feed adapter ready</span></div>
            <div className="price-axis"><span>ASK —</span><span>MID —</span><span>BID —</span></div>
          </div>
        </div>

        <div className="panel orderbook-panel">
          <div className="panel-header"><div><small>DEPTH</small><h2>Order Book</h2></div><ListFilter size={17}/></div>
          <div className="book-head"><span>Price</span><span>Amount</span><span>Total</span></div>
          <div className="empty-book">Counterparty DEX order feed will populate here.</div>
          <div className="spread">SPREAD <b>—</b></div>
        </div>

        <div className="panel ticket-panel">
          <div className="panel-header"><div><small>ORDER ENTRY</small><h2>New Order</h2></div><CircleDollarSign size={18}/></div>
          <div className="buy-sell"><button onClick={()=>setSide('BUY')} className={side==='BUY'?'buy active':'buy'}>BUY</button><button onClick={()=>setSide('SELL')} className={side==='SELL'?'sell active':'sell'}>SELL</button></div>
          <label>Order Type<select value={orderType} onChange={e=>setOrderType(e.target.value)}><option>LIMIT</option><option>MARKET</option></select></label>
          <label>Price<input placeholder={orderType==='MARKET'?'Market':'0.00000000'}/></label>
          <label>Amount<input placeholder="0.00000000"/></label>
          <div className="allocation"><button>25%</button><button>50%</button><button>75%</button><button>100%</button></div>
          <div className="review-box"><span>Network</span><b>Bitcoin / Counterparty</b><span>Signing</span><b>User-controlled</b></div>
          <button className={`submit ${side.toLowerCase()}`}>REVIEW {side} ORDER</button>
          <p className="safety-note">No private keys are stored by the GitHub Pages client. Transaction composition, signing and broadcast remain separate security gates.</p>
        </div>

        <div className="panel assets-panel">
          <div className="panel-header"><div><small>COUNTERPARTY REGISTRY</small><h2>NEO Assets</h2></div><Star size={17}/></div>
          <div className="address-tags"><span>Treasury {TREASURY_ADDRESS.slice(0,8)}…</span><span>Orange Chip™ {FOUNDATION_ADDRESS.slice(0,8)}…</span></div>
          {visibleAssets.length ? visibleAssets.map(a => <div className="asset-row" key={`${a.address}-${a.asset}`}><div><b>{a.asset}</b><small>{a.address===FOUNDATION_ADDRESS?'ORANGE CHIP™':'TREASURY'}</small></div><strong>{a.quantity ?? a.balance ?? '—'}</strong></div>) : <div className="empty-assets"><Bitcoin size={24}/><b>Asset adapter ready</b><span>Connect the API service to populate balances from Counterparty Core.</span></div>}
        </div>

        <div className="panel positions-panel">
          <div className="panel-header"><div><small>ACCOUNT</small><h2>Positions & P/L</h2></div><BriefcaseBusiness size={18}/></div>
          <div className="positions-head"><span>Market</span><span>Size</span><span>Entry</span><span>P/L</span></div>
          <div className="empty-book">No locally tracked positions. Counterparty DEX settles on-chain; portfolio analytics will derive holdings and fills from wallet history.</div>
        </div>

        <div className="panel footer-terminal">
          <div><span className="status-dot"/><b>Bitcoin rail</b><small>adapter</small></div>
          <div><span className="status-dot"/><b>Counterparty XCP</b><small>adapter</small></div>
          <div><span className="status-dot muted"/><b>Execution</b><small>review-gated</small></div>
          <div><span className="status-dot muted"/><b>Base44</b><small>reference build</small></div>
        </div>
      </section>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
