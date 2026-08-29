import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BarChart3, Bitcoin, BookOpen, BriefcaseBusiness, CandlestickChart, CircleDollarSign, Gauge, Layers3, ListFilter, Search, ShieldCheck, Star, WalletCards } from 'lucide-react';
import './styles.css';

const FOUNDATION_ADDRESS = '1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8';
const TREASURY_ADDRESS = '18FyntJG9hdXYvanm67mGgbyo1P7adckvg';
const API_BASE = window.NEO_EXCHANGE_API_BASE || '';
const CURRENCY_REGISTRY = '/neo-system/api/neo-counter/currencies.json';
const CHECKOUT_GATEWAY = '/neo-system/neo-counter/';

const fallbackMarkets = [
  { pair: 'BTC/XCP', best_bid: null, best_ask: null, mid: null, status: 'API REQUIRED' },
  { pair: 'NOMNI/XCP', best_bid: null, best_ask: null, mid: null, status: 'DISCOVERY' },
  { pair: 'NOMNI/BTC', best_bid: null, best_ask: null, mid: null, status: 'DISCOVERY' },
  { pair: 'NEOCASH/XCP', best_bid: null, best_ask: null, mid: null, status: 'DISCOVERY' }
];

function fmt(value, digits = 8) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function App() {
  const [activePair, setActivePair] = useState('BTC/XCP');
  const [side, setSide] = useState('BUY');
  const [orderType, setOrderType] = useState('LIMIT');
  const [assets, setAssets] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [book, setBook] = useState({ bids: [], asks: [], best_bid: null, best_ask: null, mid: null, spread: null });
  const [feedState, setFeedState] = useState('REFERENCE');
  const [search, setSearch] = useState('');
  const [checkoutAmount, setCheckoutAmount] = useState('25.00');
  const [checkoutCurrency, setCheckoutCurrency] = useState('NMNI');
  const [worldCurrencies, setWorldCurrencies] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetch(`${API_BASE}/api/neo-exchange/assets?addresses=${TREASURY_ADDRESS},${FOUNDATION_ADDRESS}`).then(r => { if (!r.ok) throw new Error('assets'); return r.json(); }),
      fetch(`${API_BASE}/api/neo-exchange/markets`).then(r => { if (!r.ok) throw new Error('markets'); return r.json(); }),
      fetch(CURRENCY_REGISTRY).then(r => { if (!r.ok) throw new Error('currencies'); return r.json(); })
    ]).then(([assetResult, marketResult, currencyResult]) => {
      if (cancelled) return;
      if (assetResult.status === 'fulfilled') setAssets(assetResult.value.assets || []);
      if (currencyResult.status === 'fulfilled') setWorldCurrencies(currencyResult.value.currencies || []);
      if (marketResult.status === 'fulfilled') {
        const liveMarkets = marketResult.value.markets || [];
        setMarkets(liveMarkets);
        setFeedState(marketResult.value.status || 'LIVE');
        if (liveMarkets.length && !liveMarkets.some(m => m.pair === activePair)) setActivePair(liveMarkets[0].pair);
      } else {
        setFeedState(assetResult.status === 'fulfilled' ? 'DEGRADED' : 'REFERENCE');
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const [base, quote] = activePair.split('/');
    if (!base || !quote) return;
    let cancelled = false;
    setBook({ bids: [], asks: [], best_bid: null, best_ask: null, mid: null, spread: null });
    fetch(`${API_BASE}/api/neo-exchange/orderbook?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}&limit=18`)
      .then(r => { if (!r.ok) throw new Error('orderbook'); return r.json(); })
      .then(d => { if (!cancelled) { setBook(d); setFeedState(d.status || 'LIVE'); } })
      .catch(() => { if (!cancelled && feedState === 'LIVE') setFeedState('DEGRADED'); });
    return () => { cancelled = true; };
  }, [activePair]);

  const displayMarkets = useMemo(() => {
    const live = markets.length ? markets : fallbackMarkets;
    const priority = ['BTC/XCP', 'NOMNI/XCP', 'NOMNI/BTC', 'NEOCASH/XCP'];
    return [...live].sort((a, b) => {
      const ai = priority.indexOf(a.pair); const bi = priority.indexOf(b.pair);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return (b.bid_depth || 0) + (b.ask_depth || 0) - ((a.bid_depth || 0) + (a.ask_depth || 0));
    }).slice(0, 8);
  }, [markets]);

  const visibleAssets = useMemo(() => {
    const q = search.trim().toUpperCase();
    return assets.filter(a => !q || a.asset?.includes(q)).slice(0, 12);
  }, [assets, search]);

  const checkoutEntry = useMemo(() => worldCurrencies.find(c => c.symbol === checkoutCurrency), [worldCurrencies, checkoutCurrency]);
  const checkout = () => {
    const cents = Math.round(Number(checkoutAmount) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) return;
    const asset = checkoutEntry?.counterpartyAsset || '';
    const rail = asset === 'BTC' ? 'BTC' : asset === 'NOMNI' ? 'NOMNI' : asset ? 'XCP' : 'BTC';
    const url = new URL(CHECKOUT_GATEWAY, window.location.origin);
    url.searchParams.set('checkout', '1');
    url.searchParams.set('service', 'neo-exchange');
    url.searchParams.set('order', `neo-exchange-${Date.now()}`);
    url.searchParams.set('label', `NEO Exchange ${activePair}`);
    url.searchParams.set('amount', String(cents));
    url.searchParams.set('currency', checkoutCurrency);
    url.searchParams.set('rail', rail);
    if (asset) url.searchParams.set('asset', asset);
    url.searchParams.set('success_url', window.location.href);
    url.searchParams.set('cancel_url', window.location.href);
    window.location.assign(url.toString());
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">N</div><div><strong>NEO EXCHANGE</strong><span>BITCOIN / COUNTERPARTY XCP</span></div></div>
      <div className="symbol-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Symbol, asset, address or market"/></div>
      <div className="top-status"><span className={`status-dot ${feedState === 'REFERENCE' ? 'muted' : ''}`}/><b>{feedState}</b><small>LIVE MARKET GATE</small></div>
    </header>

    <aside className="sidebar">
      {[[CandlestickChart,'Trade'],[BarChart3,'Markets'],[Layers3,'Assets'],[WalletCards,'Wallet'],[BriefcaseBusiness,'Portfolio'],[BookOpen,'Orders'],[Activity,'History'],[Gauge,'Analytics'],[ShieldCheck,'Security']].map(([Icon,label]) => <button className={label==='Trade'?'active':''} key={label}><Icon size={17}/><span>{label}</span></button>)}
    </aside>

    <main className="workspace">
      <section className="market-strip">
        {displayMarkets.map(m => <button key={m.pair} onClick={()=>setActivePair(m.pair)} className={activePair===m.pair?'selected':''}><span>{m.pair}</span><strong>{fmt(m.mid)}</strong><small>BID {fmt(m.best_bid)} · ASK {fmt(m.best_ask)}</small></button>)}
      </section>

      <section className="terminal-grid">
        <div className="panel chart-panel">
          <div className="panel-header"><div><small>MARKET</small><h1>{activePair}</h1></div><div className="quote"><b>{fmt(book.mid)}</b><span>BID {fmt(book.best_bid)} · ASK {fmt(book.best_ask)}</span></div></div>
          <div className="toolbar"><button>1m</button><button>5m</button><button>15m</button><button>1H</button><button className="active">4H</button><button>1D</button><i/><button>Indicators</button><button>Objects</button></div>
          <div className="chart-stage">
            <div className="chart-watermark"><CandlestickChart size={50}/><b>NEO EXCHANGE</b><span>Verified historical OHLC adapter is the next data gate</span></div>
            <div className="price-axis"><span>ASK {fmt(book.best_ask)}</span><span>MID {fmt(book.mid)}</span><span>BID {fmt(book.best_bid)}</span></div>
          </div>
        </div>

        <div className="panel orderbook-panel">
          <div className="panel-header"><div><small>COUNTERPARTY DEX DEPTH</small><h2>Order Book</h2></div><ListFilter size={17}/></div>
          <div className="book-head"><span>Price</span><span>Amount</span><span>Total</span></div>
          <div className="book-scroll">
            {book.asks?.length ? book.asks.slice().reverse().map((o,i)=><div className="book-row ask" key={`a-${o.tx_hash || i}`}><span>{fmt(o.price)}</span><span>{fmt(o.amount)}</span><span>{fmt(o.total)}</span></div>) : <div className="book-empty-line">No verified asks</div>}
            <div className="mid-row"><b>{fmt(book.mid)}</b><span>{activePair}</span></div>
            {book.bids?.length ? book.bids.map((o,i)=><div className="book-row bid" key={`b-${o.tx_hash || i}`}><span>{fmt(o.price)}</span><span>{fmt(o.amount)}</span><span>{fmt(o.total)}</span></div>) : <div className="book-empty-line">No verified bids</div>}
          </div>
          <div className="spread">SPREAD <b>{fmt(book.spread)}</b></div>
        </div>

        <div className="panel ticket-panel">
          <div className="panel-header"><div><small>ORDER ENTRY</small><h2>New Order</h2></div><CircleDollarSign size={18}/></div>
          <div className="buy-sell"><button onClick={()=>setSide('BUY')} className={side==='BUY'?'buy active':'buy'}>BUY</button><button onClick={()=>setSide('SELL')} className={side==='SELL'?'sell active':'sell'}>SELL</button></div>
          <label>Order Type<select value={orderType} onChange={e=>setOrderType(e.target.value)}><option>LIMIT</option><option>MARKET</option></select></label>
          <label>Price<input placeholder={orderType==='MARKET'?'Market':fmt(side==='BUY' ? book.best_ask : book.best_bid)}/></label>
          <label>Amount<input placeholder="0.00000000"/></label>
          <div className="allocation"><button>25%</button><button>50%</button><button>75%</button><button>100%</button></div>
          <div className="review-box"><span>Market</span><b>{activePair}</b><span>Network</span><b>Bitcoin / Counterparty</b><span>Signing</span><b>User-controlled</b></div>
          <button className={`submit ${side.toLowerCase()}`}>REVIEW {side} ORDER</button>
          <p className="safety-note">No private keys are stored by the GitHub Pages client. Composition, signing and broadcast remain separate reviewed security gates.</p>
        </div>

        <div className="panel assets-panel">
          <div className="panel-header"><div><small>COUNTERPARTY REGISTRY</small><h2>NEO Assets</h2></div><Star size={17}/></div>
          <div className="address-tags"><span>Treasury {TREASURY_ADDRESS.slice(0,8)}…</span><span>Orange Chip™ {FOUNDATION_ADDRESS.slice(0,8)}…</span></div>
          {visibleAssets.length ? visibleAssets.map(a => <div className="asset-row" key={`${a.address}-${a.asset}`}><div><b>{a.asset}</b><small>{a.address===FOUNDATION_ADDRESS?'ORANGE CHIP™':'TREASURY'}</small></div><strong>{a.quantity ?? '—'}</strong></div>) : <div className="empty-assets"><Bitcoin size={24}/><b>Asset adapter ready</b><span>Connect the API runtime to populate Treasury and Orange Chip™ balances.</span></div>}
        </div>

        <div className="panel positions-panel">
          <div className="panel-header"><div><small>ACCOUNT</small><h2>Positions & P/L</h2></div><BriefcaseBusiness size={18}/></div>
          <div className="positions-head"><span>Market</span><span>Size</span><span>Entry</span><span>P/L</span></div>
          <div className="empty-book">Counterparty settles on-chain. This panel will derive positions and realized/unrealized P/L from wallet balances, completed matches and verified valuation feeds.</div>
        </div>

        <div className="panel positions-panel">
          <div className="panel-header"><div><small>NEO COUNTER</small><h2>World Currency Checkout</h2></div><WalletCards size={18}/></div>
          <label>Amount (USD)<input value={checkoutAmount} onChange={e=>setCheckoutAmount(e.target.value)} inputMode="decimal"/></label>
          <label>World Currency<select value={checkoutCurrency} onChange={e=>setCheckoutCurrency(e.target.value)}>{worldCurrencies.map(c=><option key={c.id} value={c.symbol}>{c.symbol} — {c.name}</option>)}</select></label>
          <button className="submit buy" onClick={checkout}>PAY WITH NEO COUNTER</button>
          <p className="safety-note">{checkoutEntry?.counterpartyAsset?`Verified settlement asset: ${checkoutEntry.counterpartyAsset}`:`${checkoutCurrency} is available from the shared Treasury catalog; exact Counterparty asset mapping is required before token settlement is auto-verified.`}</p>
        </div>

        <div className="panel footer-terminal">
          <div><span className="status-dot"/><b>Bitcoin rail</b><small>mainnet</small></div>
          <div><span className="status-dot"/><b>Counterparty XCP</b><small>live depth adapter</small></div>
          <div><span className="status-dot muted"/><b>Execution</b><small>review-gated</small></div>
          <div><span className="status-dot muted"/><b>NEO Counter</b><small>{worldCurrencies.length || '—'} currencies</small></div>
        </div>
      </section>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
