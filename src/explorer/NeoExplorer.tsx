import { Activity, Bitcoin, BookOpen, ExternalLink, Globe2, Search, Sparkles, WalletCards } from 'lucide-react'

const FOUNDATION_ADDRESS='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'

const orangeChipAssets=[
  {symbol:'NOMNI',category:'Index / Unit of Account',market:'NOMNI/XCP',status:'FLAGSHIP'},
  {symbol:'ESTATEBOND',category:'Specialized Capital',market:'Pending',status:'REGISTRY'},
  {symbol:'NEOTRUST',category:'Private Asset',market:'Pending',status:'REGISTRY'},
  {symbol:'WORLDCREDIT',category:'Credit Instrument',market:'Pending',status:'REGISTRY'},
]

const asks=[['0.000084','1,250,000','105.00'],['0.000082','800,000','65.60'],['0.000080','600,000','48.00'],['0.000078','450,000','35.10']]
const bids=[['0.000076','700,000','53.20'],['0.000074','1,100,000','81.40'],['0.000072','900,000','64.80'],['0.000070','1,500,000','105.00']]

export function NeoExplorer(){
  return <div className="neo-explorer">
    <section className="explorer-hero"><div><p>NEO EXPLORER • GLOBAL BITCOIN / COUNTERPARTY INTELLIGENCE TERMINAL</p><h2>NEO DEX</h2><span>Bitcoin settlement • Counterparty asset protocol • CES community liquidity • NEO Prime intelligence</span></div><div className="explorer-actions"><button><Search size={15}/> Search Asset</button><button><Sparkles size={15}/> Ask NEO Prime</button></div></section>
    <section className="foundation-registry"><div><span>ORANGE CHIP™ FOUNDATION ADDRESS</span><b>{FOUNDATION_ADDRESS}</b><small>Canonical Bitcoin/Counterparty registry source for the Orange Chip™ universe.</small></div><a href={`https://blockstream.info/address/${FOUNDATION_ADDRESS}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Blockstream</a></section>
    <section className="explorer-stats"><div><span>FLAGSHIP MARKET</span><b>NOMNI / XCP</b><small>NEO DEX prototype pair</small></div><div><span>SETTLEMENT</span><b>BITCOIN</b><small>Non-custodial target architecture</small></div><div><span>ASSET PROTOCOL</span><b>COUNTERPARTY</b><small>Issuance, orders and transfers</small></div><div><span>COMMUNITY MARKET</span><b>CES</b><small>Adapter layer planned</small></div><div><span>INTELLIGENCE</span><b>NEO PRIME</b><small>Source-attributed synthesis</small></div></section>
    <section className="explorer-grid">
      <article className="card explorer-panel orderbook"><div className="explorer-panel-title"><div><span>NEO DEX ORDER BOOK</span><h3>NOMNI / XCP</h3></div><em>MODEL</em></div><div className="book-cols"><span>PRICE XCP</span><span>AMOUNT NOMNI</span><span>TOTAL XCP</span></div>{asks.map(r=><div className="book-row ask" key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}<div className="spread">SPREAD <b>0.000004 XCP</b></div>{bids.map(r=><div className="book-row bid" key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}<p className="model-note">Displayed order values are illustrative until the live Counterparty DEX feed is connected.</p></article>
      <article className="card explorer-panel trade-ticket"><div className="explorer-panel-title"><div><span>EXECUTION</span><h3>Trade NOMNI</h3></div><Activity size={17}/></div><div className="trade-tabs"><b>LIMIT</b><span>MARKET</span></div><label>PRICE (XCP)<input defaultValue="0.000076"/></label><label>AMOUNT (NOMNI)<input placeholder="Enter amount"/></label><div className="trade-total"><span>Estimated total</span><b>— XCP</b></div><div className="trade-buttons"><button>BUY</button><button>SELL</button></div><p>Execution remains disabled until the wallet/signing and Counterparty transaction-broadcast layer is connected.</p></article>
      <article className="card explorer-panel prime-panel"><div className="explorer-panel-title"><div><span>NEO PRIME</span><h3>Market Intelligence</h3></div><Sparkles size={17}/></div><div className="prime-copy"><b>Liquidity synthesis</b><p>NEO Prime will normalize XCP DEX, CES and external exchange feeds into one attributed market view. Conflicting prices remain separated by source.</p></div><div className="source-row"><b>XCP DEX</b><span>Adapter target</span></div><div className="source-row"><b>CES</b><span>Community liquidity</span></div><div className="source-row"><b>External Exchanges</b><span>Venue adapters</span></div><div className="source-row"><b>NEO DEX</b><span>Unified interface</span></div></article>
    </section>
    <section className="card registry-panel"><div className="explorer-panel-title"><div><span>ORANGE CHIP™ ASSET REGISTRY</span><h3>Foundation Universe</h3></div><Bitcoin size={17}/></div><div className="registry-table"><div className="registry-head"><span>ASSET</span><span>CLASSIFICATION</span><span>MARKET</span><span>STATUS</span></div>{orangeChipAssets.map(a=><div className="registry-row" key={a.symbol}><b>{a.symbol}</b><span>{a.category}</span><span>{a.market}</span><em>{a.status}</em></div>)}</div></section>
    <section className="explorer-architecture"><div><Bitcoin size={18}/><b>Bitcoin</b><span>Settlement foundation</span></div><div><BookOpen size={18}/><b>Counterparty</b><span>Asset protocol</span></div><div><Globe2 size={18}/><b>CES</b><span>Community liquidity</span></div><div><WalletCards size={18}/><b>NEO DEX</b><span>Market interface</span></div><div><Sparkles size={18}/><b>NEO Prime</b><span>Intelligence layer</span></div></section>
  </div>
}
